from fastapi import APIRouter, HTTPException
from app.schemas.ai import DescriptionRequest, ParseRequest
from app.services.ai_service import generate_description_cached, parse_invoice_cached

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.post("/generate-description")
async def generate_description(req: DescriptionRequest):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Item or Service name is required")
    
    try:
        desc = generate_description_cached(req.name.strip().lower())
        is_mock = desc.startswith("Provides premium professional")
        return {"description": desc, "isMock": is_mock}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/parse-invoice")
async def parse_invoice(req: ParseRequest):
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Natural language billing prompt is required")
    
    try:
        return parse_invoice_cached(req.prompt.strip().lower())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
