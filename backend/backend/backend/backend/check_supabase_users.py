import os
import asyncio
import httpx
from dotenv import load_dotenv

# Load environments
load_dotenv()
load_dotenv("../frontend/.env.local")

async def check():
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("Missing Supabase configuration.")
        return

    supabase_url = supabase_url.rstrip("/")
    
    headers = {
        "Authorization": f"Bearer {supabase_key}",
        "apikey": supabase_key
    }
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Query auth.users via Admin Auth API
        print("Fetching users from Supabase Auth...")
        auth_res = await client.get(f"{supabase_url}/auth/v1/admin/users", headers=headers)
        if auth_res.status_code == 200:
            auth_users = auth_res.json().get("users", [])
            print(f"Total users in Supabase Auth: {len(auth_users)}")
            for u in auth_users:
                print(f"  - UID: {u['id']}, Email: {u.get('email')}, Created: {u.get('created_at')}")
        else:
            print(f"Failed to fetch auth users: {auth_res.status_code} - {auth_res.text}")
            auth_users = []

        # 2. Query public.users via PostgREST
        print("\nFetching users from public.users table...")
        public_res = await client.get(f"{supabase_url}/rest/v1/users", headers=headers)
        if public_res.status_code == 200:
            public_users = public_res.json()
            print(f"Total users in public.users: {len(public_users)}")
            for u in public_users:
                print(f"  - UID: {u.get('uid')}, Email: {u.get('email')}, Name: {u.get('name')}")
        else:
            print(f"Failed to fetch public users: {public_res.status_code} - {public_res.text}")

if __name__ == "__main__":
    asyncio.run(check())
