import os
import httpx
import asyncio
from dotenv import load_dotenv

load_dotenv()
load_dotenv("../frontend/.env.local")

async def check():
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }
    
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{url}/rest/v1/", headers=headers)
        if res.status_code == 200:
            spec = res.json()
            paths = list(spec.get("paths", {}).keys())
            print("Available paths:")
            for p in paths:
                if "/rpc/" in p:
                    print("  -", p)
        else:
            print("Failed to fetch spec:", res.status_code, res.text)

asyncio.run(check())
