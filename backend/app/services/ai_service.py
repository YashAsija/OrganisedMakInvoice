import os
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None

def get_ai_client():
    if not genai:
        return None
    api_key = os.getenv("GEMINI_API_KEY_BILLING") or os.getenv("GEMINI_API_KEY")
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
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.7)
        )
        return response.text.strip() if response.text else f"High quality {name} deliverables and consulting solutions."
    except Exception as e:
        print(f"AI Description Error: {e}")
        # Try fallback to gemini-2.5-flash
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.7)
            )
            return response.text.strip() if response.text else f"High quality {name} deliverables and consulting solutions."
        except Exception as fallback_err:
            print(f"AI Description Fallback Error: {fallback_err}")
            raise Exception("Failed to generate AI description")
