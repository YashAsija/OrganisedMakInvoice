from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.api import ai_routes

load_dotenv()

app = FastAPI(title="MakInvoice Backend API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_routes.router)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Enterprise backend running smoothly"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
