import os
import time
import httpx
from collections import defaultdict
from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)

# In-memory IP rate limiter history
request_history = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # seconds
MAX_REQUESTS_PER_WINDOW = 60  # limit requests per client IP to 60 per minute

async def verify_supabase_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    # Fail closed if credentials are missing or contain template placeholders
    if (not supabase_url or "YOUR_PROJECT_REF" in supabase_url or 
        not supabase_key or "YOUR_ANON_KEY" in supabase_key):
        raise HTTPException(status_code=500, detail="Database authentication is unconfigured on the server")

    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication token required")
        
    import base64
    import json
    
    token = credentials.credentials
    try:
        parts = token.split('.')
        if len(parts) != 3:
            raise ValueError("Invalid JWT")
        payload = parts[1]
        payload += '=' * (-len(payload) % 4)
        decoded = base64.urlsafe_b64decode(payload)
        user_data = json.loads(decoded)
        user_data["access_token"] = token
        
        # 'sub' is the user id in Supabase JWTs
        if "sub" not in user_data:
            raise ValueError("No sub claim")
        
        # Since 'id' is used in some places in the backend, set it to 'sub'
        user_data["id"] = user_data["sub"]
            
        return user_data
    except Exception as e:
        raise HTTPException(status_code=401, detail="Session expired or invalid token")

async def check_rate_limit(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    current_time = time.time()
    
    # Filter request timestamps within the active time window
    request_history[client_ip] = [
        t for t in request_history[client_ip]
        if current_time - t < RATE_LIMIT_WINDOW
    ]
    
    if len(request_history[client_ip]) >= MAX_REQUESTS_PER_WINDOW:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please slow down and try again."
        )
        
    request_history[client_ip].append(current_time)
