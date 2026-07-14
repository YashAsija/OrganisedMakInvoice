"""
PIN Lock — server-side verification endpoints.

Security model:
  - PIN is hashed with bcrypt (cost=12) before storage in users.pin_hash
  - Brute-force protection: 5 wrong attempts → 60-second lockout per user_id
    (tracked in process memory — resets on server restart, which is acceptable
     since a server restart already breaks any ongoing brute-force session)
  - All endpoints require a valid Supabase JWT (via verify_supabase_token)
  - The service-role key is used for DB writes to bypass RLS safely

Sync note:
  The offline fallback uses PBKDF2 (Web Crypto API) in the frontend.
  The two hash algorithms don't need to match — they serve different paths:
    - Online:  bcrypt (server, this file)
    - Offline: PBKDF2 + salt (client, frontend/src/lib/biometrics.ts)
"""
import os
import time
import logging
from collections import defaultdict

import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from passlib.context import CryptContext

from app.middleware.auth import verify_supabase_token

logger = logging.getLogger("pin_routes")

router = APIRouter(prefix="/api/auth/pin", tags=["pin"])

# ---------------------------------------------------------------------------
# bcrypt context (cost factor 12 — ~250ms on modern hardware, fine for PIN UI)
# ---------------------------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ---------------------------------------------------------------------------
# Brute-force tracker
# In-memory dict: { user_id: {"attempts": int, "locked_until": float} }
# ---------------------------------------------------------------------------
MAX_ATTEMPTS = 5
LOCKOUT_SECONDS = 60
_tracker: dict = defaultdict(lambda: {"attempts": 0, "locked_until": 0.0})


def _check_lockout(user_id: str) -> None:
    """Raise 429 if user is currently locked out."""
    entry = _tracker[user_id]
    now = time.time()
    if entry["locked_until"] > now:
        remaining = int(entry["locked_until"] - now)
        raise HTTPException(
            status_code=429,
            detail=f"Too many incorrect attempts. Try again in {remaining} seconds."
        )


def _record_failure(user_id: str) -> int:
    """Increment attempt counter; lock out after MAX_ATTEMPTS. Returns remaining attempts."""
    entry = _tracker[user_id]
    entry["attempts"] += 1
    if entry["attempts"] >= MAX_ATTEMPTS:
        entry["locked_until"] = time.time() + LOCKOUT_SECONDS
        entry["attempts"] = 0
        raise HTTPException(
            status_code=429,
            detail=f"Too many incorrect attempts. Locked for {LOCKOUT_SECONDS} seconds."
        )
    return MAX_ATTEMPTS - entry["attempts"]


def _clear_tracker(user_id: str) -> None:
    _tracker[user_id] = {"attempts": 0, "locked_until": 0.0}


def _supabase_headers() -> dict:
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")
    return url.rstrip("/"), {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------
class PinSetRequest(BaseModel):
    pin: str  # raw 4-digit PIN — hashed on the server before storage


class PinVerifyRequest(BaseModel):
    pin: str
    user_id: str  # redundant with JWT but used for lockout keying


# ---------------------------------------------------------------------------
# POST /api/auth/pin/set
# ---------------------------------------------------------------------------
@router.post("/set")
async def set_pin(req: PinSetRequest, user: dict = Depends(verify_supabase_token)):
    """
    Hash and store a 4-digit PIN for the authenticated user.
    Called by the frontend when the user enables or changes their PIN.
    Also called at first login if the user had a local PBKDF2 hash only.
    """
    if not req.pin.isdigit() or len(req.pin) != 4:
        raise HTTPException(status_code=400, detail="PIN must be exactly 4 digits (0-9).")

    user_id = user.get("id") or user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Cannot determine user identity from token.")

    pin_hash = pwd_context.hash(req.pin)  # bcrypt — includes its own random salt
    base_url, headers = _supabase_headers()

    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.patch(
            f"{base_url}/rest/v1/users?uid=eq.{user_id}",
            json={"pin_hash": pin_hash},
            headers=headers,
        )
        if res.status_code not in (200, 204):
            logger.error(f"Failed to store pin_hash for {user_id}: {res.status_code} {res.text}")
            raise HTTPException(status_code=500, detail="Failed to store PIN. Try again.")

    _clear_tracker(user_id)  # reset any existing lockout when PIN is changed
    logger.info(f"PIN set for user {user_id}")
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# POST /api/auth/pin/verify
# ---------------------------------------------------------------------------
@router.post("/verify")
async def verify_pin(req: PinVerifyRequest, user: dict = Depends(verify_supabase_token)):
    """
    Verify a submitted PIN against the stored bcrypt hash.
    Returns {verified: true} on success.
    Returns 401 on wrong PIN (with remaining attempts).
    Returns 429 if the user is currently locked out.
    """
    user_id = user.get("id") or user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Cannot determine user identity from token.")

    # Check lockout before touching the DB
    _check_lockout(user_id)

    base_url, headers = _supabase_headers()

    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(
            f"{base_url}/rest/v1/users?uid=eq.{user_id}&select=pin_hash",
            headers=headers,
        )
        if res.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to fetch PIN from database.")

        data = res.json()
        if not data:
            # User row doesn't exist yet — shouldn't happen, but treat as no PIN set
            raise HTTPException(status_code=404, detail="User not found.")

        stored_hash = data[0].get("pin_hash")

    if not stored_hash:
        # No server-side PIN set. Accept local PBKDF2 fallback — return null signal.
        # This happens for users who set their PIN before server-side storage was added.
        raise HTTPException(
            status_code=404,
            detail="No server-side PIN set. Use local verification."
        )

    if not pwd_context.verify(req.pin, stored_hash):
        remaining = _record_failure(user_id)
        raise HTTPException(
            status_code=401,
            detail=f"Incorrect PIN. {remaining} attempt{'s' if remaining != 1 else ''} remaining."
        )

    # Success
    _clear_tracker(user_id)
    logger.info(f"PIN verified for user {user_id}")
    return {"verified": True}


# ---------------------------------------------------------------------------
# DELETE /api/auth/pin/clear
# ---------------------------------------------------------------------------
@router.delete("/clear")
async def clear_pin(user: dict = Depends(verify_supabase_token)):
    """Remove the stored PIN hash when the user disables their screen lock."""
    user_id = user.get("id") or user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Cannot determine user identity from token.")

    base_url, headers = _supabase_headers()

    async with httpx.AsyncClient(timeout=10.0) as client:
        await client.patch(
            f"{base_url}/rest/v1/users?uid=eq.{user_id}",
            json={"pin_hash": None},
            headers=headers,
        )

    _clear_tracker(user_id)
    logger.info(f"PIN cleared for user {user_id}")
    return {"status": "ok"}
