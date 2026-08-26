import os
import time
import logging
from collections import defaultdict
from dotenv import load_dotenv
from fastapi import Request, HTTPException, Response
from jose import jwt

# Setup logger
logger = logging.getLogger("admin_auth")

_backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(_backend_dir, ".env"))
load_dotenv(os.path.join(_backend_dir, "..", "frontend", ".env.local"))

# Admin credentials & config from environment
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@makinvoices.com")
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH")  # bcrypt hash of admin password
ADMIN_JWT_SECRET = os.getenv("ADMIN_JWT_SECRET")
ADMIN_ROUTE_SLUG = os.getenv("ADMIN_ROUTE_SLUG") or os.getenv("NEXT_PUBLIC_ADMIN_ROUTE_SLUG")

# Enforce secure ADMIN_JWT_SECRET on application startup
if not ADMIN_JWT_SECRET or ADMIN_JWT_SECRET == "default_secret_please_change":
    raise RuntimeError("ADMIN_JWT_SECRET is unset or using default value 'default_secret_please_change'")

# Strict Email Domain and Allowlist Gating
ADMIN_EMAIL_DOMAIN = os.getenv("ADMIN_EMAIL_DOMAIN", "makinvoices.com").lower()
allowed_emails_env = os.getenv("ADMIN_ALLOWED_EMAILS", "")
ADMIN_ALLOWED_EMAILS = [email.strip().lower() for email in allowed_emails_env.split(",") if email.strip()]
# Include ADMIN_EMAIL as part of the default allowed list
if ADMIN_EMAIL.lower() not in ADMIN_ALLOWED_EMAILS:
    ADMIN_ALLOWED_EMAILS.append(ADMIN_EMAIL.lower())


import httpx
from datetime import datetime, timezone, timedelta

# In-memory IP rate limiter history for admin login
LOGIN_WINDOW = 60  # seconds
MAX_LOGIN_ATTEMPTS = 5  # lockout after 5 attempts in 1 min

def sign_token(payload: dict) -> str:
    return jwt.encode(payload, ADMIN_JWT_SECRET, algorithm="HS256")

def verify_token(token: str) -> dict:
    try:
        return jwt.decode(token, ADMIN_JWT_SECRET, algorithms=["HS256"])
    except Exception:
        return None

async def verify_admin_token(request: Request) -> dict:
    """
    Verifies admin session token from HttpOnly cookie.
    Fails closed and raises a 404 (Not Found) if unauthenticated to avoid leaking existence of admin endpoints.
    """
    token = request.cookies.get("admin_session")
    if not token:
        raise HTTPException(status_code=404, detail="Not Found")
        
    payload = verify_token(token)
    if not payload or payload.get("email", "").lower() not in ADMIN_ALLOWED_EMAILS:
        raise HTTPException(status_code=404, detail="Not Found")
        
    return payload

def get_client_ip(request: Request) -> str:
    """Extract real client IP address from headers (X-Forwarded-For, X-Real-IP) or request.client."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        first_ip = forwarded_for.split(",")[0].strip()
        if first_ip:
            return first_ip

    real_ip = request.headers.get("X-Real-IP")
    if real_ip and real_ip.strip():
        return real_ip.strip()

    if request.client and request.client.host:
        return request.client.host

    return "unknown"

async def check_login_rate_limit(request: Request):
    """
    Blocks excessive login attempts using persistent Supabase tracking.
    """
    client_ip = get_client_ip(request)
    supabase_url = (os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or "").rstrip("/")
    supabase_key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_ANON_KEY")
        or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    )

    if not supabase_url or "YOUR_PROJECT_REF" in supabase_url or not supabase_key:
        return

    try:
        now_utc = datetime.now(timezone.utc)
        now_iso = now_utc.isoformat()
        cutoff_iso = (now_utc - timedelta(seconds=60)).isoformat()

        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "count=exact"
        }

        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{supabase_url}/rest/v1/rate_limit_events",
                json={"ip": client_ip, "endpoint": "admin_login", "hit_at": now_iso},
                headers=headers
            )

            res = await client.get(
                f"{supabase_url}/rest/v1/rate_limit_events",
                params={
                    "ip": f"eq.{client_ip}",
                    "endpoint": "eq.admin_login",
                    "hit_at": f"gt.{cutoff_iso}"
                },
                headers=headers
            )

            if res.status_code in (200, 206):
                range_header = res.headers.get("content-range", "")
                if "/" in range_header:
                    total_str = range_header.split("/")[-1]
                    count = int(total_str) if total_str.isdigit() else len(res.json())
                else:
                    count = len(res.json())

                if count >= MAX_LOGIN_ATTEMPTS:
                    raise HTTPException(
                        status_code=429,
                        detail="Too many login attempts. Please try again in 1 minute."
                    )
    except HTTPException:
        raise
    except Exception:
        pass

async def log_admin_action(ip_address: str, user_agent: str, status: str, details: str):
    """
    Logs admin events to the admin_audit_logs table (handles Supabase vs SQLite fallback).
    """
    from app.services import admin_db
    try:
        await admin_db.log_audit_action(
            ip_address=ip_address,
            user_agent=user_agent,
            status=status,
            details=details
        )
    except Exception as e:
        logger.error(f"Error logging admin action: {str(e)}")
