import os
import httpx
from datetime import datetime, timezone, timedelta
from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt

security = HTTPBearer(auto_error=False)

async def verify_supabase_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    # Fail closed if credentials are missing or contain template placeholders
    if (not supabase_url or "YOUR_PROJECT_REF" in supabase_url or 
        not supabase_key or "YOUR_ANON_KEY" in supabase_key):
        raise HTTPException(status_code=500, detail="Database authentication is unconfigured on the server")

    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication token required")
        
    token = credentials.credentials
    secret = os.getenv("SUPABASE_JWT_SECRET") or ""
    try:
        user_data = jwt.decode(token, secret, algorithms=["HS256"])
        user_data["access_token"] = token
        
        # 'sub' is the user id in Supabase JWTs
        if "sub" not in user_data:
            raise ValueError("No sub claim")
        
        # Since 'id' is used in some places in the backend, set it to 'sub'
        user_data["id"] = user_data["sub"]
            
        return user_data
    except Exception:
        raise HTTPException(status_code=401, detail="Session expired or invalid token")

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

async def check_rate_limit(request: Request):
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
                json={"ip": client_ip, "endpoint": "ai", "hit_at": now_iso},
                headers=headers
            )

            res = await client.get(
                f"{supabase_url}/rest/v1/rate_limit_events",
                params={
                    "ip": f"eq.{client_ip}",
                    "endpoint": "eq.ai",
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

                if count >= 60:
                    raise HTTPException(
                        status_code=429,
                        detail="Rate limit exceeded. Please slow down and try again."
                    )
    except HTTPException:
        raise
    except Exception:
        pass

