from pydantic import BaseModel
from typing import Any, Dict, List, Optional

class DescriptionRequest(BaseModel):
    name: str

class ParseRequest(BaseModel):
    prompt: str
    current_invoice: Optional[Dict[str, Any]] = None
    allowed_fields: Optional[List[str]] = None

