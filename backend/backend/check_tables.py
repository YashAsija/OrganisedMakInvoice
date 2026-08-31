import os
import asyncio
import httpx
from dotenv import load_dotenv

# Load from backend/.env and fallback/merge from frontend/.env.local
load_dotenv()
load_dotenv("../frontend/.env.local")

async def check():
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    # Use service role key to bypass RLS and query schema
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("Missing Supabase URL or Service Role Key.")
        return

    headers = {
        "Authorization": f"Bearer {supabase_key}",
        "apikey": supabase_key
    }
    
    async with httpx.AsyncClient() as client:
        for table in ["tickets", "ticket_messages", "admin_audit_logs"]:
            res = await client.get(f"{supabase_url}/rest/v1/{table}?limit=1", headers=headers)
            print(f"Table '{table}' check status: {res.status_code}")
            if res.status_code == 200:
                print(f"  - Table '{table}' exists.")
            elif res.status_code == 404:
                print(f"  - Table '{table}' does NOT exist.")
            else:
                print(f"  - Error: {res.text}")

asyncio.run(check())
