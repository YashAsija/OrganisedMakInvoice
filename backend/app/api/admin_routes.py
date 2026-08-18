import os
import time
import httpx
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext

from app.middleware.admin_auth import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD_HASH,
    sign_token,
    verify_admin_token,
    check_login_rate_limit,
    log_admin_action
)

logger = logging.getLogger("admin_routes")
router = APIRouter(prefix="/api/admin", tags=["admin"])

# Bcrypt password verification context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Helper to build headers and URL for Supabase API requests
def _supabase_admin_client():
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    return url.rstrip("/"), headers

# Request/Response schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TicketReplyRequest(BaseModel):
    message: str

class TicketUpdateRequest(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    internal_notes: Optional[str] = None

class BulkUpdateRequest(BaseModel):
    ticket_ids: List[str]
    status: str

class UserNotesRequest(BaseModel):
    notes: str

# --- Endpoints ---

@router.post("/login")
async def login(req: LoginRequest, request: Request, response: Response):
    """
    Dedicated admin login endpoint. Scoped HttpOnly session cookie is returned on success.
    Blocks brute force using IP rate-limiting.
    """
    from app.middleware.admin_auth import ADMIN_EMAIL_DOMAIN, ADMIN_ALLOWED_EMAILS
    
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    # Rate limit check
    check_login_rate_limit(request)
    
    email_clean = req.email.strip().lower()
    
    # Check domain
    domain_ok = email_clean.endswith(f"@{ADMIN_EMAIL_DOMAIN}")
    
    # Check allowlist
    allowlist_ok = email_clean in ADMIN_ALLOWED_EMAILS
    
    # Verify Email & Password (all admins share the ADMIN_PASSWORD_HASH for simplicity, or specific checking can occur)
    email_matches = domain_ok and allowlist_ok
    
    # Fail closed if ADMIN_PASSWORD_HASH is unset
    if not ADMIN_PASSWORD_HASH:
        logger.error("ADMIN_PASSWORD_HASH environment variable is not configured!")
        await log_admin_action(client_ip, user_agent, "failed", "Admin password hash is unconfigured on server")
        raise HTTPException(status_code=500, detail="Server authentication is unconfigured")
        
    password_verified = False
    if email_matches:
        try:
            password_verified = pwd_context.verify(req.password, ADMIN_PASSWORD_HASH)
        except Exception as e:
            logger.warning(f"Passlib verification failed, falling back to native bcrypt: {str(e)}")
            try:
                import bcrypt
                password_verified = bcrypt.checkpw(req.password.encode("utf-8"), ADMIN_PASSWORD_HASH.encode("utf-8"))
            except Exception as ex:
                logger.error(f"Fallback native bcrypt verification error: {str(ex)}")
                password_verified = False

    if not email_matches or not password_verified:
        try:
            await log_admin_action(client_ip, user_agent, "failed", f"Failed login attempt for email: {req.email}")
        except Exception:
            pass
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    # Successful login: sign token (expires in 1 hour)
    expiry = int(time.time()) + 3600
    payload = {
        "email": email_clean,
        "exp": expiry
    }
    token = sign_token(payload)
    
    # Set scoped HttpOnly secure cookie
    response.set_cookie(
        key="admin_session",
        value=token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=3600
    )
    
    try:
        await log_admin_action(client_ip, user_agent, "success", f"Admin logged in successfully: {email_clean}")
    except Exception:
        pass
    return {"status": "success", "message": "Logged in successfully"}

@router.post("/logout")
async def logout(response: Response, payload: dict = Depends(verify_admin_token)):
    """Clears the admin session cookie."""
    response.delete_cookie(key="admin_session", path="/")
    return {"status": "success", "message": "Logged out successfully"}

@router.get("/me")
async def get_me(payload: dict = Depends(verify_admin_token)):
    """Returns basic admin profile details to keep the frontend updated."""
    return {"email": payload.get("email")}

@router.get("/stats")
async def get_stats(payload: dict = Depends(verify_admin_token)):
    """Fetch quick overview metrics for dashboard."""
    import datetime
    from app.services import admin_db
    base_url, headers = _supabase_admin_client()
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Total users — query from Supabase Auth admin API to get all users and signup dates
        res_auth_users = await client.get(
            f"{base_url}/auth/v1/admin/users?per_page=1000",
            headers=headers
        )
        auth_users = res_auth_users.json().get("users", []) if res_auth_users.status_code == 200 else []
        users_count = len(auth_users)
        
        # New signups in the past 7 days
        now_dt = datetime.datetime.now(datetime.timezone.utc)
        one_week_ago_dt = now_dt - datetime.timedelta(days=7)
        new_signups_week = 0
        for u in auth_users:
            created_raw = u.get("created_at")
            if created_raw:
                try:
                    # Supabase returns ISO 8601 with timezone offset
                    created_dt = datetime.datetime.fromisoformat(created_raw.replace("Z", "+00:00"))
                    if created_dt >= one_week_ago_dt:
                        new_signups_week += 1
                except Exception:
                    pass
        
        # 2. Tickets total, open, closed
        use_supabase = await admin_db.check_table_exists("tickets")
        tickets_data = await admin_db.get_tickets_for_stats()
        
        total_tickets = len(tickets_data)
        open_tickets = sum(1 for t in tickets_data if t.get("status") in ("Open", "In Progress"))
        resolved_tickets = sum(1 for t in tickets_data if t.get("status") == "Resolved")
        closed_tickets = sum(1 for t in tickets_data if t.get("status") == "Closed")
        
        # Simple breakdown by status
        status_breakdown = {
            "Open": sum(1 for t in tickets_data if t.get("status") == "Open"),
            "In Progress": sum(1 for t in tickets_data if t.get("status") == "In Progress"),
            "Resolved": resolved_tickets,
            "Closed": closed_tickets
        }
        
    return {
        "total_users": users_count,
        "total_tickets": total_tickets,
        "open_tickets": open_tickets,
        "status_breakdown": status_breakdown,
        "new_signups_week": new_signups_week,
        "db_mode": "supabase" if use_supabase else "sqlite",
        "db_connected": True
    }


@router.get("/analytics")
async def get_analytics(payload: dict = Depends(verify_admin_token)):
    """
    Returns aggregated platform analytics for the admin analytics page.
    All data is aggregated (counts, ratios) — no individual user data exposed.
    """
    import datetime
    from app.services import admin_db
    base_url, headers = _supabase_admin_client()

    analytics = {
        "users": {
            "total": 0,
            "new_today": 0,
            "new_this_week": 0,
            "new_last_week": 0,
            "verified_email": 0,
            "providers": {},
        },
        "invoices": {
            "total": 0,
            "users_with_invoices": 0,
            "users_without_invoices": 0,
            "recurring": 0,
        },
        "tickets": {
            "total": 0,
            "open": 0,
            "in_progress": 0,
            "resolved": 0,
            "closed": 0,
            "categories": {},
            "priorities": {},
        },
    }

    now_dt = datetime.datetime.now(datetime.timezone.utc)
    today_start = now_dt.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now_dt - datetime.timedelta(days=7)
    last_week_start = now_dt - datetime.timedelta(days=14)

    auth_users = []
    async with httpx.AsyncClient(timeout=15.0) as client:
        # --- Users from Supabase Auth ---
        try:
            res_auth = await client.get(
                f"{base_url}/auth/v1/admin/users?per_page=1000",
                headers=headers
            )
            if res_auth.status_code == 200:
                auth_users = res_auth.json().get("users", [])
                analytics["users"]["total"] = len(auth_users)

                for u in auth_users:
                    created_raw = u.get("created_at", "")
                    try:
                        created_dt = datetime.datetime.fromisoformat(created_raw.replace("Z", "+00:00"))
                        if created_dt >= today_start:
                            analytics["users"]["new_today"] += 1
                        if created_dt >= week_start:
                            analytics["users"]["new_this_week"] += 1
                        elif created_dt >= last_week_start:
                            analytics["users"]["new_last_week"] += 1
                    except Exception:
                        pass

                    # Email verification
                    if u.get("email_confirmed_at") or u.get("user_metadata", {}).get("email_verified"):
                        analytics["users"]["verified_email"] += 1

                    # Provider breakdown
                    provider = u.get("app_metadata", {}).get("provider", "email")
                    analytics["users"]["providers"][provider] = analytics["users"]["providers"].get(provider, 0) + 1
        except Exception as e:
            logger.error(f"Analytics: failed to fetch auth users: {e}")

        # --- Invoice stats ---
        try:
            res_inv = await client.get(
                f"{base_url}/rest/v1/invoices?select=userId,recurringSettings",
                headers=headers
            )
            if res_inv.status_code == 200:
                invoices = res_inv.json()
                analytics["invoices"]["total"] = len(invoices)
                
                auth_user_ids = {u["id"] for u in auth_users} if auth_users else set()
                active_users = set()
                recurring_count = 0
                for inv in invoices:
                    uid = inv.get("userId") or inv.get("user_id") or ""
                    if uid and (not auth_user_ids or uid in auth_user_ids):
                        active_users.add(uid)
                    rec_settings = inv.get("recurringSettings") or {}
                    if isinstance(rec_settings, dict) and rec_settings.get("isRecurring"):
                        recurring_count += 1
                analytics["invoices"]["users_with_invoices"] = len(active_users)
                analytics["invoices"]["users_without_invoices"] = max(
                    0, analytics["users"]["total"] - len(active_users)
                )
                analytics["invoices"]["recurring"] = recurring_count
            else:
                logger.error(f"Analytics: invoices endpoint returned {res_inv.status_code}: {res_inv.text}")
        except Exception as e:
            logger.error(f"Analytics: failed to fetch invoices: {e}")

    # --- Ticket stats ---
    try:
        tickets_data = await admin_db.get_tickets_for_stats()
        analytics["tickets"]["total"] = len(tickets_data)
        for t in tickets_data:
            status = t.get("status", "Open")
            if status == "Open":
                analytics["tickets"]["open"] += 1
            elif status == "In Progress":
                analytics["tickets"]["in_progress"] += 1
            elif status == "Resolved":
                analytics["tickets"]["resolved"] += 1
            elif status == "Closed":
                analytics["tickets"]["closed"] += 1

            cat = t.get("category", "General")
            analytics["tickets"]["categories"][cat] = analytics["tickets"]["categories"].get(cat, 0) + 1
            pri = t.get("priority", "Medium")
            analytics["tickets"]["priorities"][pri] = analytics["tickets"]["priorities"].get(pri, 0) + 1
    except Exception as e:
        logger.error(f"Analytics: failed to fetch ticket data: {e}")

    return analytics

async def sync_database(payload: dict = Depends(verify_admin_token)):
    """Syncs/migrates local SQLite tickets, replies, and audit logs to Supabase."""
    from app.services import admin_db
    res = await admin_db.sync_local_to_supabase()
    return res


@router.get("/tickets")
async def get_tickets(
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort: str = "newest",
    payload: dict = Depends(verify_admin_token)
):
    """
    Paginated search/filter query on tickets.
    """
    from app.services import admin_db
    res = await admin_db.get_tickets(
        page=page,
        limit=limit,
        status=status,
        priority=priority,
        category=category,
        search=search,
        sort=sort
    )
    return {
        "tickets": res["tickets"],
        "total": res["total"],
        "page": page,
        "limit": limit
    }

@router.get("/tickets/{ticket_id}")
async def get_ticket_details(ticket_id: str, payload: dict = Depends(verify_admin_token)):
    """Fetch full ticket detail including conversation history and profile info of the creator."""
    from app.services import admin_db
    details = await admin_db.get_ticket_details(ticket_id)
    if not details:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    ticket = details["ticket"]
    messages = details["messages"]
    
    # Get basic user detail if user_id is set
    user_info = None
    user_id = ticket.get("user_id")
    if user_id:
        base_url, headers = _supabase_admin_client()
        async with httpx.AsyncClient(timeout=10.0) as client:
            res_user = await client.get(f"{base_url}/rest/v1/users?uid=eq.{user_id}", headers=headers)
            if res_user.status_code == 200 and res_user.json():
                user_info = res_user.json()[0]
                user_info.pop("pin_hash", None)
                
    return {
        "ticket": ticket,
        "messages": messages,
        "user_info": user_info
    }

@router.post("/tickets/{ticket_id}/reply")
async def reply_to_ticket(ticket_id: str, req: TicketReplyRequest, request: Request, payload: dict = Depends(verify_admin_token)):
    """Append a reply to the ticket discussion. Logs action and triggers email alert placeholder."""
    from app.services import admin_db
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    admin_email = payload.get("email", "unknown")
    
    details = await admin_db.get_ticket_details(ticket_id)
    if not details:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket = details["ticket"]
    
    success = await admin_db.reply_to_ticket(
        ticket_id=ticket_id,
        sender_type="admin",
        message=req.message
    )
    if not success:
        await log_admin_action(client_ip, user_agent, "failed", f"Admin {admin_email} failed replying to ticket {ticket_id}")
        raise HTTPException(status_code=500, detail="Failed to insert reply")
        
    await log_admin_action(client_ip, user_agent, "success", f"Admin {admin_email} replied to ticket {ticket_id}: '{req.message[:50]}...'")
    
    # Email alert log simulation
    logger.info(f"[EMAIL NOTIFICATION] Support reply sent to {ticket['user_email']} for Ticket: {ticket['subject']}")
    
    return {"status": "success", "message": "Reply added successfully"}

@router.patch("/tickets/{ticket_id}")
async def update_ticket(ticket_id: str, req: TicketUpdateRequest, request: Request, payload: dict = Depends(verify_admin_token)):
    """Modify status, priority, or internal notes on a specific ticket."""
    from app.services import admin_db
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    admin_email = payload.get("email", "unknown")
    
    update_data = {}
    if req.status is not None:
        update_data["status"] = req.status
    if req.priority is not None:
        update_data["priority"] = req.priority
    if req.internal_notes is not None:
        update_data["internal_notes"] = req.internal_notes
        
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")
        
    success = await admin_db.update_ticket(ticket_id, update_data)
    if not success:
        await log_admin_action(client_ip, user_agent, "failed", f"Admin {admin_email} failed to update ticket {ticket_id}")
        raise HTTPException(status_code=500, detail="Failed to update ticket")
        
    # Log audit details
    log_msg = f"Admin {admin_email} updated ticket {ticket_id} attributes: {list(update_data.keys())}"
    await log_admin_action(client_ip, user_agent, "success", log_msg)
    
    return {"status": "success", "message": "Ticket updated successfully"}

@router.post("/tickets/bulk-update")
async def bulk_update_tickets(req: BulkUpdateRequest, payload: dict = Depends(verify_admin_token)):
    """Applies status change across multiple ticket IDs."""
    if not req.ticket_ids:
        raise HTTPException(status_code=400, detail="No ticket IDs supplied")
        
    from app.services import admin_db
    success = await admin_db.bulk_update_tickets(req.ticket_ids, req.status)
    if not success:
        raise HTTPException(status_code=500, detail="Bulk update failed")
        
    return {"status": "success", "message": f"Successfully updated {len(req.ticket_ids)} tickets"}

async def _ensure_users_synced(client: httpx.AsyncClient, base_url: str, headers: dict):
    """Auto-synchronize users from Supabase Auth to public.users table if any are missing."""
    from datetime import datetime, timezone
    try:
        auth_res = await client.get(f"{base_url}/auth/v1/admin/users?per_page=1000", headers=headers)
        if auth_res.status_code != 200:
            return {}
        auth_users = auth_res.json().get("users", [])
        auth_map = {au["id"]: au for au in auth_users if "id" in au}

        public_res = await client.get(f"{base_url}/rest/v1/users?select=uid", headers=headers)
        existing_uids = set()
        if public_res.status_code == 200:
            existing_uids = {u["uid"] for u in public_res.json() if "uid" in u}

        missing_profiles = []
        for uid, au in auth_map.items():
            if uid not in existing_uids:
                email = au.get("email") or ""
                metadata = au.get("user_metadata") or {}
                full_name = metadata.get("full_name") or metadata.get("name") or (email.split("@")[0] if "@" in email else "MakInvoice Member")
                company_name = metadata.get("company_name") or full_name
                phone = au.get("phone") or metadata.get("phone") or ""

                missing_profiles.append({
                    "uid": uid,
                    "name": company_name,
                    "email": email,
                    "phone": phone,
                    "address": "",
                    "taxId": "",
                    "currency": "INR",
                    "defaultTaxRate": 18,
                    "updatedAt": au.get("updated_at") or au.get("created_at") or datetime.now(timezone.utc).isoformat()
                })

        if missing_profiles:
            await client.post(f"{base_url}/rest/v1/users", json=missing_profiles, headers=headers)

        return auth_map
    except Exception as e:
        logger.error(f"Error ensuring users synced: {str(e)}")
        return {}

@router.post("/users/sync")
async def sync_users(request: Request, payload: dict = Depends(verify_admin_token)):
    """Synchronize users in Supabase Auth to the public users table."""
    base_url, headers = _supabase_admin_client()
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    admin_email = payload.get("email", "unknown")

    async with httpx.AsyncClient(timeout=15.0) as client:
        auth_map = await _ensure_users_synced(client, base_url, headers)
        
    await log_admin_action(
        client_ip, 
        user_agent, 
        "success", 
        f"Admin {admin_email} synced users directory: total {len(auth_map)} accounts"
    )
    
    return {
        "status": "success",
        "synced": len(auth_map),
        "failed": 0,
        "total": len(auth_map)
    }

@router.get("/users")
async def get_users(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    payload: dict = Depends(verify_admin_token)
):
    """Retrieve list of all registered users with search capabilities."""
    from app.services import admin_db
    base_url, headers = _supabase_admin_client()
    offset = (page - 1) * limit
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Build query for public.users
        params = ["order=updatedAt.desc"]
        if search:
            params.append(f"or=(email.ilike.*{search}*,name.ilike.*{search}*)")
            
        params.append(f"limit={limit}")
        params.append(f"offset={offset}")
        
        query_str = "&".join(params)
        url = f"{base_url}/rest/v1/users?{query_str}"
        
        headers_with_count = headers.copy()
        headers_with_count["Prefer"] = "count=exact"
        
        res = await client.get(url, headers=headers_with_count)
        data = res.json() if res.status_code in (200, 206) else []

        # If public.users is completely empty on page 1 with no search filter, auto-sync from Supabase Auth
        if not data and page == 1 and not search:
            await _ensure_users_synced(client, base_url, headers)
            res = await client.get(url, headers=headers_with_count)
            data = res.json() if res.status_code in (200, 206) else []

        # Extract total count from PostgREST content-range header
        content_range = res.headers.get("content-range", "")
        total_count = len(data)
        if "/" in content_range:
            try:
                total_count = int(content_range.split("/")[-1])
            except ValueError:
                total_count = len(data)

        # Map admin notes & fallback timestamps
        for u in data:
            u.pop("pin_hash", None)
            u["created_at"] = u.get("created_at") or u.get("updatedAt")
            u["updated_at"] = u.get("updatedAt") or u.get("created_at")
            if not u.get("admin_notes"):
                u["admin_notes"] = await admin_db.get_user_admin_notes(u["uid"])
                
    return {
        "users": data,
        "total": total_count,
        "page": page,
        "limit": limit
    }

@router.get("/users/{user_id}")
async def get_user_details(user_id: str, payload: dict = Depends(verify_admin_token)):
    """Fetch complete stats and invoicing profile data for an individual user."""
    from app.services import admin_db
    base_url, headers = _supabase_admin_client()
    
    async with httpx.AsyncClient(timeout=12.0) as client:
        # Get user from public.users
        res_user = await client.get(f"{base_url}/rest/v1/users?uid=eq.{user_id}", headers=headers)
        user = None
        if res_user.status_code == 200 and res_user.json():
            user = res_user.json()[0]
            user.pop("pin_hash", None)
        else:
            # Fallback to Supabase Auth user if public.users row missing
            res_auth = await client.get(f"{base_url}/auth/v1/admin/users/{user_id}", headers=headers)
            if res_auth.status_code == 200:
                au = res_auth.json()
                metadata = au.get("user_metadata") or {}
                full_name = metadata.get("full_name") or metadata.get("name") or (au.get("email", "").split("@")[0] if "@" in au.get("email", "") else "MakInvoice Member")
                user = {
                    "uid": au["id"],
                    "name": metadata.get("company_name") or full_name,
                    "email": au.get("email") or "",
                    "phone": au.get("phone") or metadata.get("phone") or "",
                    "address": "",
                    "taxId": "",
                    "currency": "INR",
                    "defaultTaxRate": 18,
                    "created_at": au.get("created_at"),
                    "updated_at": au.get("updated_at") or au.get("created_at"),
                    "admin_notes": None
                }
            else:
                raise HTTPException(status_code=404, detail="User not found")
        
        # Get auth user details
        try:
            res_auth = await client.get(f"{base_url}/auth/v1/admin/users/{user_id}", headers=headers)
            if res_auth.status_code == 200:
                au = res_auth.json()
                user["created_at"] = au.get("created_at")
                user["last_sign_in_at"] = au.get("last_sign_in_at")
                user["provider"] = au.get("app_metadata", {}).get("provider")
                user["email_verified"] = au.get("email_confirmed_at") is not None or au.get("user_metadata", {}).get("email_verified") is True
                if not user.get("phone") and au.get("phone"):
                    user["phone"] = au.get("phone")
        except Exception as e:
            logger.error(f"Failed to fetch detailed auth user {user_id}: {str(e)}")
            
        # Populate admin notes fallback
        if not user.get("admin_notes"):
            user["admin_notes"] = await admin_db.get_user_admin_notes(user_id)
        
        # Get company settings profile
        res_settings = await client.get(f"{base_url}/rest/v1/company_settings?userId=eq.{user_id}", headers=headers)
        settings = res_settings.json()[0] if res_settings.status_code == 200 and res_settings.json() else {}
        
        # Get invoices with status detail for breakdown
        invoice_status_breakdown = {"draft": 0, "sent": 0, "paid": 0, "pending": 0, "cancelled": 0, "approved": 0, "rejected": 0}
        invoices_count = 0
        has_recurring = False
        try:
            res_invoices = await client.get(
                f"{base_url}/rest/v1/invoices?userId=eq.{user_id}&select=id,status,isRecurring",
                headers=headers
            )
            if res_invoices.status_code == 200:
                invoices_data = res_invoices.json()
                invoices_count = len(invoices_data)
                for inv in invoices_data:
                    status_key = (inv.get("status") or "draft").lower()
                    if status_key in invoice_status_breakdown:
                        invoice_status_breakdown[status_key] += 1
                    if inv.get("isRecurring") or inv.get("is_recurring"):
                        has_recurring = True
        except Exception as e:
            logger.error(f"Failed to fetch invoices for user {user_id}: {str(e)}")

        # Get client count — try both common table names
        client_count = 0
        for table_name in ("client_profiles", "clients", "clientprofiles"):
            try:
                res_clients = await client.get(
                    f"{base_url}/rest/v1/{table_name}?userId=eq.{user_id}&select=id",
                    headers=headers
                )
                if res_clients.status_code == 200:
                    client_count = len(res_clients.json())
                    break
            except Exception:
                continue

        # Get expense count
        expense_count = 0
        try:
            res_expenses = await client.get(
                f"{base_url}/rest/v1/expenses?userId=eq.{user_id}&select=id",
                headers=headers
            )
            if res_expenses.status_code == 200:
                expense_count = len(res_expenses.json())
        except Exception as e:
            logger.error(f"Failed to fetch expenses for user {user_id}: {str(e)}")

        # Compute profile completeness (non-PII fields only)
        completeness_fields = [
            settings.get("displayName") or user.get("name"),
            settings.get("phone") or user.get("phone"),
            settings.get("address") or user.get("address"),
            settings.get("taxId") or settings.get("pan"),
            settings.get("bankName"),
            settings.get("upiId") or settings.get("accountNumber"),
            settings.get("logoUrl"),
            settings.get("currency"),
        ]
        filled = sum(1 for f in completeness_fields if f)
        profile_completeness = round((filled / len(completeness_fields)) * 100)
        
    # Get tickets raised by this user (handles SQLite fallback)
    tickets_res = await admin_db.get_tickets(user_id=user_id, limit=100)
    tickets = tickets_res.get("tickets", [])
        
    return {
        "user": user,
        "company_settings": settings,
        "invoice_stats": {
            "total_created": invoices_count,
            "status_breakdown": invoice_status_breakdown,
            "has_recurring": has_recurring,
        },
        "client_count": client_count,
        "expense_count": expense_count,
        "profile_completeness": profile_completeness,
        "tickets": tickets
    }

@router.patch("/users/{user_id}/notes")
async def update_user_notes(user_id: str, req: UserNotesRequest, request: Request, payload: dict = Depends(verify_admin_token)):
    """Save special internal admin notes/flags on a user profile."""
    from app.services import admin_db
    base_url, headers = _supabase_admin_client()
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    admin_email = payload.get("email", "unknown")
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        # First check if user exists to fetch email for log details
        res_user = await client.get(f"{base_url}/rest/v1/users?uid=eq.{user_id}", headers=headers)
        if res_user.status_code != 200 or not res_user.json():
            raise HTTPException(status_code=404, detail="User not found")
        target_email = res_user.json()[0].get("email", "unknown")

    success = await admin_db.save_user_admin_notes(user_id, req.notes)
    if not success:
        await log_admin_action(client_ip, user_agent, "failed", f"Admin {admin_email} failed to update notes for user {target_email} ({user_id})")
        raise HTTPException(status_code=500, detail="Failed to save admin notes.")
        
    await log_admin_action(client_ip, user_agent, "success", f"Admin {admin_email} updated notes for user {target_email} ({user_id}): '{req.notes[:50]}...'")
            
    return {"status": "success", "message": "Admin notes updated successfully"}

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, request: Request, payload: dict = Depends(verify_admin_token)):
    """
    Deletes user profile, auth account from auth.users (if possible/service role) 
    or cleans database items cascading.
    """
    base_url, headers = _supabase_admin_client()
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    admin_email = payload.get("email", "unknown")

    async with httpx.AsyncClient(timeout=10.0) as client:
        # First check if user exists to fetch email for log details
        target_email = "unknown"
        res_user = await client.get(f"{base_url}/rest/v1/users?uid=eq.{user_id}", headers=headers)
        if res_user.status_code == 200 and res_user.json():
            target_email = res_user.json()[0].get("email", "unknown")
        else:
            res_auth = await client.get(f"{base_url}/auth/v1/admin/users/{user_id}", headers=headers)
            if res_auth.status_code == 200:
                target_email = res_auth.json().get("email", "unknown")
            else:
                raise HTTPException(status_code=404, detail="User not found")

        # Delete from public.users table
        await client.delete(f"{base_url}/rest/v1/users?uid=eq.{user_id}", headers=headers)

        # Delete from Supabase Auth
        try:
            await client.delete(f"{base_url}/auth/v1/admin/users/{user_id}", headers=headers)
        except Exception as e:
            logger.warning(f"Failed to delete auth user {user_id}: {str(e)}")

        # Clean local user notes if exists
        try:
            import sqlite3
            from app.services.admin_db import SQLITE_DB_PATH
            conn = sqlite3.connect(SQLITE_DB_PATH)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM user_admin_notes WHERE user_id = ?", (user_id,))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.warning(f"Failed to delete fallback admin notes for user {user_id}: {str(e)}")

        # Log audit log
        await log_admin_action(client_ip, user_agent, "success", f"Admin {admin_email} deleted user account {target_email} ({user_id})")

    return {"status": "success", "message": "User deleted successfully"}

@router.get("/audit-logs")
async def get_audit_logs(
    page: int = 1,
    limit: int = 20,
    payload: dict = Depends(verify_admin_token)
):
    """
    Retrieve logged actions from the admin_audit_logs table.
    """
    from app.services import admin_db
    res = await admin_db.get_audit_logs(page=page, limit=limit)
    return {
        "logs": res["logs"],
        "total": res["total"],
        "page": page,
        "limit": limit
    }
