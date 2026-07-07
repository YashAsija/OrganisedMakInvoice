from fastapi import APIRouter, HTTPException, Depends
from app.schemas.ai import DescriptionRequest, ParseRequest
from app.services.ai_service import generate_description_cached, parse_invoice_cached
from app.middleware.auth import verify_supabase_token, check_rate_limit

router = APIRouter(prefix="/api/ai", tags=["ai"], dependencies=[Depends(check_rate_limit)])

@router.post("/generate-description", dependencies=[Depends(verify_supabase_token)])
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

@router.post("/parse-invoice", dependencies=[Depends(verify_supabase_token)])
async def parse_invoice(req: ParseRequest):
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Natural language billing prompt is required")
    
    try:
        return parse_invoice_cached(req.prompt.strip().lower())
    except Exception as e:
        import logging
        logging.error(f"Error in parse-invoice: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error occurred during natural language invoice parsing.")
