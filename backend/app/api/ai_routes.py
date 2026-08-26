from fastapi import APIRouter, HTTPException, Depends, Request
from app.schemas.ai import DescriptionRequest, ParseRequest
from app.services.ai_service import generate_description_cached, parse_invoice_cached
from app.middleware.auth import verify_supabase_token, check_rate_limit
import os

router = APIRouter(prefix="/api/ai", tags=["ai"], dependencies=[Depends(check_rate_limit)])

@router.post("/generate-description")
async def generate_description(req: DescriptionRequest):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Item or Service name is required")
    
    try:
        desc = generate_description_cached(req.name.strip().lower())
        is_mock = desc.startswith("Provides premium professional")
        return {"description": desc, "isMock": is_mock}
    except Exception as e:
        import logging
        logging.error(f"Error in generate-description: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error occurred during description generation.")

@router.post("/parse-invoice")
async def parse_invoice(req: ParseRequest):
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Natural language billing prompt is required")
    
    try:
        return parse_invoice_cached(req.prompt.strip(), req.current_invoice, req.allowed_fields)
    except Exception as e:
        import logging, traceback
        logging.error(f"Error in parse-invoice: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error occurred during natural language invoice parsing: {str(e)}")

# Separate jobs router to handle server-side scheduled triggers
jobs_router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def _verify_scheduler_secret(request: Request):
    """
    Validates the X-Scheduler-Secret header against the SCHEDULER_SECRET env var.
    If SCHEDULER_SECRET is not set (local dev), the check is skipped with a warning.
    This prevents arbitrary internet callers from triggering invoice generation.
    """
    import logging
    secret = os.getenv("SCHEDULER_SECRET")
    if not secret:
        logging.getLogger("jobs").warning(
            "SCHEDULER_SECRET is not set — /api/jobs/recurring-invoices is unprotected. "
            "Set this env var in production."
        )
        return  # Skip check in local dev
    provided = request.headers.get("X-Scheduler-Secret", "")
    if provided != secret:
        raise HTTPException(
            status_code=403,
            detail="Invalid or missing X-Scheduler-Secret header."
        )


@jobs_router.post("/recurring-invoices")
async def trigger_recurring_invoices(request: Request):
    _verify_scheduler_secret(request)
    try:
        from app.services.scheduler import run_recurring_invoices_job
        count = await run_recurring_invoices_job()
        return {"status": "success", "invoices_generated": count}
    except Exception as e:
        import logging
        logging.error(f"Error triggering recurring invoices job: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

