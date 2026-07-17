import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

async def test():
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_ANON_KEY")
    # we need a token, let's just make a fake one to see the error message
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.fake"
    url = f"{supabase_url}/auth/v1/user"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": supabase_key
    }
    async with httpx.AsyncClient() as client:
        res = await client.get(url, headers=headers)
        print(f"Status: {res.status_code}")
        print(f"Body: {res.text}")

asyncio.run(test())
