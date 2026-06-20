import os
import json
import re
from datetime import datetime, timedelta
from functools import lru_cache

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None

def get_ai_client():
    if not genai:
        return None
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        return genai.Client(api_key=api_key)
    return None

@lru_cache(maxsize=1000)
def generate_description_cached(name: str) -> str:
    client = get_ai_client()
    if not client:
        return f"Provides premium professional {name.lower()} services tailored to the client's specifications, including complete planning, execution, detail configuration, and dedicated consulting support."
    
    prompt = f'Write a professional, concise, polished invoice line item description for the service/product named: "{name}". Keep it to 15-25 words. Make it sound appealing to a professional corporate client. Do not use quotation marks around the answer.'
    try:
        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.7)
        )
        return response.text.strip() if response.text else f"High quality {name} deliverables and consulting solutions."
    except Exception as e:
        print(f"AI Description Error: {e}")
        raise Exception("Failed to generate AI description")

@lru_cache(maxsize=500)
def parse_invoice_cached(prompt: str) -> dict:
    client = get_ai_client()
    today = datetime.now().strftime('%Y-%m-%d')
    due_date = (datetime.now() + timedelta(days=14)).strftime('%Y-%m-%d')

    if not client:
        guessed_amount = 1500.0
        match = re.search(r'(?:[\$\€\£\₹]|\bUSD|\bINR)\s*([\d,]+)', prompt, re.IGNORECASE)
        if match:
            guessed_amount = float(match.group(1).replace(',', ''))
        
        client_name = "ABC Enterprises"
        if "company" in prompt.lower():
            client_name = "Company Inc."
            
        return {
            "clientName": client_name,
            "date": today,
            "dueDate": due_date,
            "currency": "INR" if "₹" in prompt or "inr" in prompt.lower() else "USD",
            "items": [
                {
                    "name": "Consultancy & General Business Solutions",
                    "rate": guessed_amount,
                    "quantity": 1,
                    "taxPercentage": 10,
                    "description": "AI-parsed standard billing service category item description details."
                }
            ],
            "notes": "Parsed from context: " + prompt,
            "isMock": True
        }

    system_instruction = f"""You are a high-fidelity bill parser. Interpret the user's natural language request to create an invoice and construct a clean, valid JSON representation.
If money is specified, map the price.
Use standard fallback fields for today's date {today} and a due date exactly 14 days later."""

    schema = types.Schema(
        type=types.Type.OBJECT,
        properties={
            "clientName": types.Schema(type=types.Type.STRING, description="Name of the client company or individual parsed"),
            "clientEmail": types.Schema(type=types.Type.STRING, description="Client email parsed if provided"),
            "currency": types.Schema(type=types.Type.STRING, description="e.g. USD, INR, EUR, GBP based on symbols like ₹, $, €"),
            "items": types.Schema(
                type=types.Type.ARRAY,
                items=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "name": types.Schema(type=types.Type.STRING, description="Service or Product name"),
                        "rate": types.Schema(type=types.Type.NUMBER, description="Unit rate"),
                        "quantity": types.Schema(type=types.Type.NUMBER, description="Quantity"),
                        "taxPercentage": types.Schema(type=types.Type.NUMBER, description="Suggested appropriate tax rate e.g. 10"),
                        "description": types.Schema(type=types.Type.STRING, description="Brief elegant professional description of the service")
                    },
                    required=["name", "rate", "quantity"]
                )
            ),
            "notes": types.Schema(type=types.Type.STRING, description="Notes or terms derived from the string description")
        },
        required=["clientName", "items", "currency"]
    )

    try:
        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=schema
            )
        )
        return json.loads(response.text.strip()) if response.text else {}
    except Exception as e:
        print(f"AI Parse Invoice Error: {e}")
        raise Exception("Failed to parse billing instruction")
