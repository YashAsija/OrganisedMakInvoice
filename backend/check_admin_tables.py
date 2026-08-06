import os
import httpx
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def create_tables():
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        # Check if tickets table exists by querying PostgREST schema endpoint or trying a GET request
        res = await client.get(f"{url.rstrip('/')}/rest/v1/tickets?limit=1", headers=headers)
        print("GET tickets status:", res.status_code, res.text)
        
        res_audit = await client.get(f"{url.rstrip('/')}/rest/v1/admin_audit_logs?limit=1", headers=headers)
        print("GET admin_audit_logs status:", res_audit.status_code, res_audit.text)

asyncio.run(create_tables())
