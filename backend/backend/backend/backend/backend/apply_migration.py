import os
import httpx
import asyncio
from dotenv import load_dotenv

load_dotenv()
load_dotenv("../frontend/.env.local")

async def run_migration():
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    print(f"Target Supabase URL: {url}")
    if not url or not key:
        print("Missing credentials.")
        return

    # Try executing SQL via Supabase Management / SQL REST endpoints if available
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }

    with open("../supabase/migrations/20260804_admin_panel.sql", "r", encoding="utf-8") as f:
        sql_content = f.read()

    async with httpx.AsyncClient(timeout=15.0) as client:
        # Try pg_net or exec_sql or rpc endpoints if defined
        res = await client.post(f"{url}/rest/v1/rpc/exec_sql", json={"query": sql_content}, headers=headers)
        print(f"RPC exec_sql response: {res.status_code} - {res.text}")

asyncio.run(run_migration())
