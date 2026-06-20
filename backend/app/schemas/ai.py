from pydantic import BaseModel

class DescriptionRequest(BaseModel):
    name: str

class ParseRequest(BaseModel):
    prompt: str
