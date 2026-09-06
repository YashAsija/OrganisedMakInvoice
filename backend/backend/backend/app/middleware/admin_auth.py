import os
import time
import hmac
import hashlib
import json
import base64
import logging
from collections import defaultdict
from dotenv import load_dotenv
from fastapi import Request, HTTPException, Response

# Setup logger
logger = logging.getLogger("admin_auth")

_backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(_backend_dir, ".env"))
load_dotenv(os.path.join(_backend_dir, "..", "frontend", ".env.local"))

# Admin credentials from environment
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@makinvoices.com")
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH")  # bcrypt hash of admin password
ADMIN_JWT_SECRET = os.getenv("ADMIN_JWT_SECRET", "default_secret_please_change")

# Strict Email Domain and Allowlist Gating
ADMIN_EMAIL_DOMAIN = os.getenv("ADMIN_EMAIL_DOMAIN", "makinvoices.com").lower()
allowed_emails_env = os.getenv("ADMIN_ALLOWED_EMAILS", "")
ADMIN_ALLOWED_EMAILS = [email.strip().lower() for email in allowed_emails_env.split(",") if email.strip()]
# Include ADMIN_EMAIL as part of the default allowed list
if ADMIN_EMAIL.lower() not in ADMIN_ALLOWED_EMAILS:
    ADMIN_ALLOWED_EMAILS.append(ADMIN_EMAIL.lower())


# In-memory IP rate limiter history for admin login
login_attempts = defaultdict(list)
LOGIN_WINDOW = 60  # seconds
MAX_LOGIN_ATTEMPTS = 5  # lockout after 5 attempts in 1 min

# Generate a secure hash signature helper
def sign_token(payload: dict) -> str:
    payload_json = json.dumps(payload)
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode()).decode()
    signature = hmac.new(
        ADMIN_JWT_SECRET.encode(),
        payload_b64.encode(),
        hashlib.sha256
    ).hexdigest()
    return f"{payload_b64}.{signature}"

def verify_token(token: str) -> dict:
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload_b64, signature = parts
        
        # Verify signature
        expected_sig = hmac.new(
            ADMIN_JWT_SECRET.encode(),
            payload_b64.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(signature, expected_sig):
            return None
            
        payload_json = base64.urlsafe_b64decode(payload_b64.encode()).decode()
        payload = json.loads(payload_json)
        
        # Check expiry
        if payload.get("exp", 0) < time.time():
            return None
            
        return payload
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

def check_login_rate_limit(request: Request):
    """
    Blocks excessive login attempts.
    """
    client_ip = request.client.host if request.client else "unknown"
    current_time = time.time()
    
    # Filter attempts in the current window
    login_attempts[client_ip] = [
        t for t in login_attempts[client_ip]
        if current_time - t < LOGIN_WINDOW
    ]
    
    if len(login_attempts[client_ip]) >= MAX_LOGIN_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Please try again in 1 minute."
        )
    
    login_attempts[client_ip].append(current_time)

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
