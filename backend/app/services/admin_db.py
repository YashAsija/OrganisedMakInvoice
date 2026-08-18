import os
import sqlite3
import httpx
import uuid
import logging
from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any

logger = logging.getLogger("admin_db")

# Path to the fallback SQLite database file in the backend directory
SQLITE_DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "makinvoices_admin.db"
)

# Caching for Supabase table checks to avoid constant network requests
_table_check_cache: Dict[str, Tuple[bool, float]] = {}
_CACHE_TTL = 60.0  # seconds

def init_sqlite_db():
    """Initializes the local fallback SQLite tables if they do not exist."""
    try:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        
        # Tickets fallback table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS tickets (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            user_email TEXT NOT NULL,
            user_name TEXT,
            subject TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Open',
            priority TEXT NOT NULL DEFAULT 'Medium',
            category TEXT NOT NULL DEFAULT 'General',
            internal_notes TEXT,
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        );
        """)
        
        # Ticket Messages fallback table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS ticket_messages (
            id TEXT PRIMARY KEY,
            ticket_id TEXT REFERENCES tickets(id) ON DELETE CASCADE,
            sender_type TEXT NOT NULL,
            sender_id TEXT,
            message TEXT NOT NULL,
            attachments TEXT DEFAULT '[]',
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        );
        """)
        
        # Admin Audit Logs fallback table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS admin_audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip_address TEXT,
            user_agent TEXT,
            status TEXT NOT NULL,
            details TEXT,
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        );
        """)
        
        # User Admin Notes fallback table (used for private administrative flags per user)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_admin_notes (
            user_id TEXT PRIMARY KEY,
            notes TEXT,
            updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        );
        """)
        
        conn.commit()
        conn.close()
        logger.info("Local fallback SQLite database initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize local SQLite database: {str(e)}")

# Initialize on import
init_sqlite_db()

def _get_supabase_client() -> Tuple[str, Dict[str, str]]:
    """Helper to retrieve Supabase URL and service role headers."""
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    return url.rstrip("/"), headers

async def check_table_exists(table_name: str) -> bool:
    """
    Checks if a table exists in Supabase.
    Uses a 60-second in-memory cache to prevent redundant HTTP requests.
    """
    global _table_check_cache
    now = datetime.now().timestamp()
    
    # Check cache
    if table_name in _table_check_cache:
        cached_val, expiry = _table_check_cache[table_name]
        if now < expiry:
            return cached_val
            
    url, headers = _get_supabase_client()
    if not url or not headers.get("apikey"):
        _table_check_cache[table_name] = (False, now + _CACHE_TTL)
        return False
        
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            # Query table with limit=1 to test if it exists
            res = await client.get(f"{url}/rest/v1/{table_name}?limit=1", headers=headers)
            exists = (res.status_code == 200 or res.status_code == 204)
            _table_check_cache[table_name] = (exists, now + _CACHE_TTL)
            return exists
    except Exception as e:
        logger.warning(f"Error checking table '{table_name}' on Supabase: {str(e)}")
        # Don't cache connection errors long
        _table_check_cache[table_name] = (False, now + 5.0)
        return False

# --- Tickets CRUD & Queries ---

async def get_tickets(
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort: str = "newest",
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Gets paginated & filtered tickets from Supabase or local SQLite."""
    use_supabase = await check_table_exists("tickets")
    offset = (page - 1) * limit
    
    if use_supabase:
        url, headers = _get_supabase_client()
        params = []
        if status:
            params.append(f"status=eq.{status}")
        if priority:
            params.append(f"priority=eq.{priority}")
        if category:
            params.append(f"category=eq.{category}")
        if search:
            params.append(f"or=(subject.ilike.*{search}*,user_email.ilike.*{search}*)")
        if user_id:
            params.append(f"user_id=eq.{user_id}")
            
        if sort == "newest":
            params.append("order=created_at.desc")
        elif sort == "oldest":
            params.append("order=created_at.asc")
        elif sort == "priority":
            params.append("order=priority.desc")
            
        params.append(f"limit={limit}")
        params.append(f"offset={offset}")
        
        headers_count = {**headers, "Prefer": "count=exact"}
        query_str = "&".join(params)
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(f"{url}/rest/v1/tickets?{query_str}", headers=headers_count)
                if res.status_code == 200:
                    tickets = res.json()
                    content_range = res.headers.get("content-range", "")
                    total = len(tickets)
                    if "/" in content_range:
                        try:
                            total = int(content_range.split("/")[-1])
                        except ValueError:
                            pass
                    return {"tickets": tickets, "total": total}
        except Exception as e:
            logger.error(f"Supabase tickets query failed: {str(e)}")
            
    # Local SQLite Fallback
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    query = "SELECT * FROM tickets WHERE 1=1"
    count_query = "SELECT COUNT(*) FROM tickets WHERE 1=1"
    params = []
    
    if status:
        query += " AND status = ?"
        count_query += " AND status = ?"
        params.append(status)
    if priority:
        query += " AND priority = ?"
        count_query += " AND priority = ?"
        params.append(priority)
    if category:
        query += " AND category = ?"
        count_query += " AND category = ?"
        params.append(category)
    if search:
        query += " AND (subject LIKE ? OR user_email LIKE ?)"
        count_query += " AND (subject LIKE ? OR user_email LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term])
    if user_id:
        query += " AND user_id = ?"
        count_query += " AND user_id = ?"
        params.append(user_id)
        
    # Ordering
    if sort == "newest":
        query += " ORDER BY created_at DESC"
    elif sort == "oldest":
        query += " ORDER BY created_at ASC"
    elif sort == "priority":
        # Custom priority ordering (Urgent -> High -> Medium -> Low)
        query += """ ORDER BY 
            CASE priority 
                WHEN 'Urgent' THEN 1 
                WHEN 'High' THEN 2 
                WHEN 'Medium' THEN 3 
                ELSE 4 
            END ASC, created_at DESC"""
            
    query += " LIMIT ? OFFSET ?"
    queryParams = params + [limit, offset]
    
    cursor.execute(count_query, params)
    total = cursor.fetchone()[0]
    
    cursor.execute(query, queryParams)
    rows = cursor.fetchall()
    tickets = [dict(row) for row in rows]
    
    conn.close()
    return {"tickets": tickets, "total": total}


async def get_tickets_for_stats() -> List[Dict[str, Any]]:
    """Fetches all tickets status, creation times, category, and priority for dashboard stats calculations."""
    use_supabase = await check_table_exists("tickets")
    
    if use_supabase:
        url, headers = _get_supabase_client()
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(f"{url}/rest/v1/tickets?select=id,status,created_at,category,priority", headers=headers)
                if res.status_code == 200:
                    return res.json()
        except Exception as e:
            logger.error(f"Supabase tickets stats query failed: {str(e)}")
            
    # Fallback to SQLite
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, status, created_at, category, priority FROM tickets")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except Exception as e:
        logger.error(f"Local SQLite tickets stats query failed: {str(e)}")
        return []
    finally:
        conn.close()

async def get_ticket_details(ticket_id: str) -> Optional[Dict[str, Any]]:
    """Fetches details of a ticket and its messaging history."""
    use_supabase = await check_table_exists("tickets")
    
    if use_supabase:
        url, headers = _get_supabase_client()
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res_ticket = await client.get(f"{url}/rest/v1/tickets?id=eq.{ticket_id}", headers=headers)
                if res_ticket.status_code == 200 and res_ticket.json():
                    ticket = res_ticket.json()[0]
                    
                    res_msg = await client.get(
                        f"{url}/rest/v1/ticket_messages?ticket_id=eq.{ticket_id}&order=created_at.asc",
                        headers=headers
                    )
                    messages = res_msg.json() if res_msg.status_code == 200 else []
                    return {"ticket": ticket, "messages": messages}
        except Exception as e:
            logger.error(f"Supabase ticket details fetch failed: {str(e)}")
            
    # Local SQLite Fallback
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,))
    ticket_row = cursor.fetchone()
    if not ticket_row:
        conn.close()
        return None
        
    ticket = dict(ticket_row)
    
    cursor.execute("SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC", (ticket_id,))
    messages = [dict(row) for row in cursor.fetchall()]
    
    # Parse attachments if they are serialized JSON strings in sqlite
    for msg in messages:
        if isinstance(msg.get("attachments"), str):
            try:
                import json
                msg["attachments"] = json.loads(msg["attachments"])
            except Exception:
                msg["attachments"] = []
                
    conn.close()
    return {"ticket": ticket, "messages": messages}

async def create_ticket(
    user_email: str,
    user_name: Optional[str],
    subject: str,
    category: str,
    priority: str,
    message: str,
    user_id: Optional[str] = None
) -> str:
    """Submits a support ticket and inserts the initial message."""
    use_supabase = await check_table_exists("tickets")
    ticket_id = str(uuid.uuid4())
    now_str = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    
    ticket_payload = {
        "id": ticket_id,
        "user_email": user_email,
        "user_name": user_name,
        "subject": subject,
        "category": category,
        "priority": priority,
        "status": "Open",
        "created_at": now_str,
        "updated_at": now_str
    }
    if user_id:
        ticket_payload["user_id"] = user_id
        
    if use_supabase:
        url, headers = _get_supabase_client()
        headers_resp = {**headers, "Prefer": "return=representation"}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(f"{url}/rest/v1/tickets", json=ticket_payload, headers=headers_resp)
                if res.status_code in (200, 201):
                    # Insert initial ticket message
                    msg_payload = {
                        "ticket_id": ticket_id,
                        "sender_type": "user",
                        "message": message
                    }
                    if user_id:
                        msg_payload["sender_id"] = user_id
                    res_msg = await client.post(f"{url}/rest/v1/ticket_messages", json=msg_payload, headers=headers)
                    if res_msg.status_code in (200, 201):
                        return ticket_id
        except Exception as e:
            logger.error(f"Supabase ticket creation failed, falling back to SQLite: {str(e)}")
            
    # Local SQLite Fallback
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("""
        INSERT INTO tickets (id, user_id, user_email, user_name, subject, status, priority, category, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            ticket_id,
            user_id,
            user_email,
            user_name,
            subject,
            "Open",
            priority,
            category,
            now_str,
            now_str
        ))
        
        msg_id = str(uuid.uuid4())
        cursor.execute("""
        INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_id, message, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (
            msg_id,
            ticket_id,
            "user",
            user_id,
            message,
            now_str
        ))
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        raise e
        
    conn.close()
    return ticket_id

async def reply_to_ticket(
    ticket_id: str,
    sender_type: str,
    message: str,
    sender_id: Optional[str] = None
) -> bool:
    """Adds a reply message to the ticket thread and updates the updated_at timestamp."""
    use_supabase = await check_table_exists("ticket_messages")
    now_str = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    
    reply_payload = {
        "ticket_id": ticket_id,
        "sender_type": sender_type,
        "message": message
    }
    if sender_id:
        reply_payload["sender_id"] = sender_id
        
    if use_supabase:
        url, headers = _get_supabase_client()
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res_msg = await client.post(f"{url}/rest/v1/ticket_messages", json=reply_payload, headers=headers)
                if res_msg.status_code in (200, 201):
                    await client.patch(
                        f"{url}/rest/v1/tickets?id=eq.{ticket_id}",
                        json={"updated_at": "now()"},
                        headers=headers
                    )
                    return True
        except Exception as e:
            logger.error(f"Supabase reply insert failed: {str(e)}")
            
    # Local SQLite Fallback
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    msg_id = str(uuid.uuid4())
    try:
        cursor.execute("""
        INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_id, message, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (msg_id, ticket_id, sender_type, sender_id, message, now_str))
        
        cursor.execute("""
        UPDATE tickets SET updated_at = ? WHERE id = ?
        """, (now_str, ticket_id))
        conn.commit()
        success = True
    except Exception as e:
        conn.rollback()
        success = False
        logger.error(f"Local SQLite reply insert failed: {str(e)}")
    finally:
        conn.close()
        
    return success

async def update_ticket(ticket_id: str, fields: Dict[str, Any]) -> bool:
    """Updates specific fields of a ticket."""
    use_supabase = await check_table_exists("tickets")
    
    update_data = fields.copy()
    update_data["updated_at"] = "now()"
    
    if use_supabase:
        url, headers = _get_supabase_client()
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.patch(
                    f"{url}/rest/v1/tickets?id=eq.{ticket_id}",
                    json=update_data,
                    headers=headers
                )
                if res.status_code in (200, 204):
                    return True
        except Exception as e:
            logger.error(f"Supabase ticket update failed: {str(e)}")
            
    # Local SQLite Fallback
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    
    set_clauses = []
    params = []
    for k, v in fields.items():
        set_clauses.append(f"{k} = ?")
        params.append(v)
        
    now_str = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    set_clauses.append("updated_at = ?")
    params.append(now_str)
    
    set_str = ", ".join(set_clauses)
    params.append(ticket_id)
    
    try:
        cursor.execute(f"UPDATE tickets SET {set_str} WHERE id = ?", params)
        conn.commit()
        success = cursor.rowcount > 0
    except Exception as e:
        conn.rollback()
        success = False
        logger.error(f"Local SQLite ticket update failed: {str(e)}")
    finally:
        conn.close()
        
    return success

async def bulk_update_tickets(ticket_ids: List[str], status: str) -> bool:
    """Performs a status bulk update across ticket IDs."""
    if not ticket_ids:
        return True
        
    use_supabase = await check_table_exists("tickets")
    
    if use_supabase:
        url, headers = _get_supabase_client()
        id_list = ",".join(ticket_ids)
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.patch(
                    f"{url}/rest/v1/tickets?id=in.({id_list})",
                    json={"status": status, "updated_at": "now()"},
                    headers=headers
                )
                if res.status_code in (200, 204):
                    return True
        except Exception as e:
            logger.error(f"Supabase bulk update failed: {str(e)}")
            
    # Local SQLite Fallback
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    placeholders = ",".join(["?"] * len(ticket_ids))
    now_str = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    
    try:
        cursor.execute(f"""
        UPDATE tickets 
        SET status = ?, updated_at = ?
        WHERE id IN ({placeholders})
        """, [status, now_str] + ticket_ids)
        conn.commit()
        success = True
    except Exception as e:
        conn.rollback()
        success = False
        logger.error(f"Local SQLite bulk update failed: {str(e)}")
    finally:
        conn.close()
        
    return success

# --- Admin Audit Logging ---

async def log_audit_action(
    ip_address: str,
    user_agent: str,
    status: str,
    details: str
) -> bool:
    """Logs administrative events to the audit trail (Supabase or SQLite)."""
    use_supabase = await check_table_exists("admin_audit_logs")
    
    payload = {
        "ip_address": ip_address,
        "user_agent": user_agent,
        "status": status,
        "details": details
    }
    
    if use_supabase:
        url, headers = _get_supabase_client()
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(f"{url}/rest/v1/admin_audit_logs", json=payload, headers=headers)
                if res.status_code in (200, 201, 204):
                    return True
        except Exception as e:
            logger.error(f"Supabase audit log insert failed: {str(e)}")
            
    # Local SQLite Fallback
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    now_str = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    try:
        cursor.execute("""
        INSERT INTO admin_audit_logs (ip_address, user_agent, status, details, created_at)
        VALUES (?, ?, ?, ?, ?)
        """, (ip_address, user_agent, status, details, now_str))
        conn.commit()
        success = True
    except Exception as e:
        conn.rollback()
        success = False
        logger.error(f"Local SQLite audit log failed: {str(e)}")
    finally:
        conn.close()
        
    return success

async def get_audit_logs(page: int = 1, limit: int = 20) -> Dict[str, Any]:
    """Retrieves paginated logs from the audit trail."""
    use_supabase = await check_table_exists("admin_audit_logs")
    offset = (page - 1) * limit
    
    if use_supabase:
        url, headers = _get_supabase_client()
        headers_count = {**headers, "Prefer": "count=exact"}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(
                    f"{url}/rest/v1/admin_audit_logs?order=created_at.desc&limit={limit}&offset={offset}",
                    headers=headers_count
                )
                if res.status_code == 200:
                    logs = res.json()
                    content_range = res.headers.get("content-range", "")
                    total = len(logs)
                    if "/" in content_range:
                        try:
                            total = int(content_range.split("/")[-1])
                        except ValueError:
                            pass
                    return {"logs": logs, "total": total}
        except Exception as e:
            logger.error(f"Supabase audit logs fetch failed: {str(e)}")
            
    # Local SQLite Fallback
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM admin_audit_logs")
    total = cursor.fetchone()[0]
    
    cursor.execute("""
    SELECT * FROM admin_audit_logs 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
    """, (limit, offset))
    logs = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return {"logs": logs, "total": total}

# --- Administrative User Notes (Fallback) ---

async def get_user_admin_notes(user_id: str) -> str:
    """
    Fetches private administrative notes for a specific user ID from local SQLite database.
    """
    try:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT notes FROM user_admin_notes WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        notes = row[0] if row else ""
        conn.close()
        return notes
    except Exception as e:
        logger.error(f"Failed to fetch user admin notes for {user_id}: {str(e)}")
        return ""

async def save_user_admin_notes(user_id: str, notes: str) -> bool:
    """
    Saves private administrative notes for a user in local SQLite.
    """
    try:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_admin_notes (
                user_id TEXT PRIMARY KEY,
                notes TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            INSERT INTO user_admin_notes (user_id, notes, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET
                notes = excluded.notes,
                updated_at = CURRENT_TIMESTAMP
        """, (user_id, notes))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"Failed to save user admin notes for {user_id}: {str(e)}")
        return False
            
    if use_supabase:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.patch(
                    f"{url}/rest/v1/users?uid=eq.{user_id}",
                    json={"admin_notes": notes},
                    headers=headers
                )
                if res.status_code in (200, 204):
                    return True
        except Exception as e:
            logger.error(f"Supabase save notes failed: {str(e)}")
            
    # Local SQLite Fallback
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    now_str = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    try:
        cursor.execute("""
        INSERT INTO user_admin_notes (user_id, notes, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET notes = excluded.notes, updated_at = excluded.updated_at
        """, (user_id, notes, now_str))
        conn.commit()
        success = True
    except Exception as e:
        conn.rollback()
        success = False
        logger.error(f"Local SQLite save notes failed: {str(e)}")
    finally:
        conn.close()
        
    return success


def clear_table_cache():
    """Clears the Supabase table exists check cache to force live check."""
    global _table_check_cache
    _table_check_cache.clear()


async def sync_local_to_supabase() -> Dict[str, Any]:
    """
    Syncs/migrates local SQLite tickets, messages, and audit logs to Supabase.
    Clears cache to query actual state. Only runs if Supabase tables exist.
    """
    clear_table_cache()
    
    # 1. Verify if Supabase tables exist
    supabase_active = await check_table_exists("tickets")
    if not supabase_active:
        return {
            "status": "error",
            "message": "Supabase 'tickets' table does not exist. Please run migration first."
        }
        
    url, headers = _get_supabase_client()
    if not url or not headers.get("apikey"):
        return {
            "status": "error",
            "message": "Supabase credentials are not configured."
        }
        
    # 2. Fetch local data from SQLite
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT * FROM tickets")
        local_tickets = [dict(row) for row in cursor.fetchall()]
        
        cursor.execute("SELECT * FROM ticket_messages")
        local_messages = [dict(row) for row in cursor.fetchall()]
        
        cursor.execute("SELECT * FROM admin_audit_logs")
        local_logs = [dict(row) for row in cursor.fetchall()]
    except Exception as e:
        conn.close()
        return {
            "status": "error",
            "message": f"Failed to read local SQLite database: {str(e)}"
        }
    finally:
        conn.close()
        
    if not local_tickets:
        return {
            "status": "success",
            "message": "No local tickets found to synchronize.",
            "synced_tickets": 0,
            "synced_messages": 0,
            "synced_logs": 0
        }
        
    # 3. Upload to Supabase using upsert
    synced_tickets_count = 0
    synced_messages_count = 0
    synced_logs_count = 0
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Sync tickets
        for ticket in local_tickets:
            payload = {
                "id": ticket["id"],
                "user_id": ticket["user_id"] if ticket.get("user_id") else None,
                "user_email": ticket["user_email"],
                "user_name": ticket.get("user_name"),
                "subject": ticket["subject"],
                "status": ticket["status"],
                "priority": ticket["priority"],
                "category": ticket["category"],
                "internal_notes": ticket.get("internal_notes"),
                "created_at": ticket["created_at"],
                "updated_at": ticket["updated_at"]
            }
            headers_upsert = {
                **headers,
                "Prefer": "resolution=merge-duplicates,return=representation"
            }
            try:
                res = await client.post(f"{url}/rest/v1/tickets", json=payload, headers=headers_upsert)
                if res.status_code in (200, 201, 204):
                    synced_tickets_count += 1
                else:
                    logger.error(f"Supabase ticket sync returned {res.status_code}: {res.text}")
            except Exception as e:
                logger.error(f"Failed to sync ticket {ticket['id']}: {str(e)}")
                
        # Sync ticket messages
        for msg in local_messages:
            payload = {
                "id": msg["id"],
                "ticket_id": msg["ticket_id"],
                "sender_type": msg["sender_type"],
                "sender_id": msg["sender_id"] if msg.get("sender_id") else None,
                "message": msg["message"],
                "created_at": msg["created_at"]
            }
            
            attachments_raw = msg.get("attachments")
            if attachments_raw:
                if isinstance(attachments_raw, str):
                    try:
                        import json
                        payload["attachments"] = json.loads(attachments_raw)
                    except Exception:
                        payload["attachments"] = []
                else:
                    payload["attachments"] = attachments_raw
            else:
                payload["attachments"] = []
                
            headers_upsert = {
                **headers,
                "Prefer": "resolution=merge-duplicates,return=representation"
            }
            try:
                res = await client.post(f"{url}/rest/v1/ticket_messages", json=payload, headers=headers_upsert)
                if res.status_code in (200, 201, 204):
                    synced_messages_count += 1
                else:
                    logger.error(f"Supabase message sync returned {res.status_code}: {res.text}")
            except Exception as e:
                logger.error(f"Failed to sync message {msg['id']}: {str(e)}")
                
        # Sync audit logs
        for log in local_logs:
            payload = {
                "ip_address": log["ip_address"],
                "user_agent": log["user_agent"],
                "status": log["status"],
                "details": log.get("details"),
                "created_at": log["created_at"]
            }
            try:
                # Audit logs table has automatic ID (BIGSERIAL), so we omit ID
                res = await client.post(f"{url}/rest/v1/admin_audit_logs", json=payload, headers=headers)
                if res.status_code in (200, 201, 204):
                    synced_logs_count += 1
            except Exception as e:
                logger.error(f"Failed to sync audit log: {str(e)}")
                
    return {
        "status": "success",
        "message": f"Successfully synchronized local SQLite data to Supabase.",
        "synced_tickets": synced_tickets_count,
        "synced_messages": synced_messages_count,
        "synced_logs": synced_logs_count
    }

