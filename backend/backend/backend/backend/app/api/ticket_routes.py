import os
import httpx
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, EmailStr
from app.middleware.auth import verify_supabase_token
from app.services import admin_db

logger = logging.getLogger("ticket_routes")
router = APIRouter(prefix="/api/tickets", tags=["tickets"])

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

class TicketCreateRequest(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str
    category: Optional[str] = "General"
    priority: Optional[str] = "Medium"
    user_id: Optional[str] = None

class UserReplyRequest(BaseModel):
    message: str

@router.post("")
@router.post("/")
async def create_ticket(req: TicketCreateRequest, request: Request):
    """
    User-facing endpoint to submit a support ticket.
    Uses admin_db.create_ticket to handle Supabase vs SQLite fallback.
    """
    try:
        ticket_id = await admin_db.create_ticket(
            user_email=req.email,
            user_name=req.name,
            subject=req.subject,
            category=req.category,
            priority=req.priority,
            message=req.message,
            user_id=req.user_id
        )
    except Exception as e:
        logger.error(f"Failed to create support ticket: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to submit ticket. Please try again later.")
        
    return {"status": "success", "ticket_id": ticket_id, "message": "Ticket created successfully"}

@router.get("")
@router.get("/")
async def get_user_tickets(user: dict = Depends(verify_supabase_token)):
    """
    Returns support tickets belonging to the authenticated user.
    """
    user_id = user.get("id")
    try:
        res = await admin_db.get_tickets(user_id=user_id, limit=100)
        return res
    except Exception as e:
        logger.error(f"Failed to fetch user tickets: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve tickets.")

@router.get("/{ticket_id}")
async def get_user_ticket_details(ticket_id: str, user: dict = Depends(verify_supabase_token)):
    """
    Returns message history thread for a specific ticket, verifying user ownership.
    """
    user_id = user.get("id")
    details = await admin_db.get_ticket_details(ticket_id)
    if not details:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    # Security check: Ensure the ticket belongs to the user
    if details["ticket"].get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    return details

@router.post("/{ticket_id}/reply")
async def user_reply_to_ticket(ticket_id: str, req: UserReplyRequest, user: dict = Depends(verify_supabase_token)):
    """
    Appends a user reply message to the ticket conversation.
    """
    user_id = user.get("id")
    details = await admin_db.get_ticket_details(ticket_id)
    if not details:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    # Security check: Ensure the ticket belongs to the user
    if details["ticket"].get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    success = await admin_db.reply_to_ticket(
        ticket_id=ticket_id,
        sender_type="user",
        message=req.message,
        sender_id=user_id
    )
    if not success:
        raise HTTPException(status_code=500, detail="Failed to insert reply")
        
    return {"status": "success", "message": "Reply added successfully"}
