from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import sys
import asyncio
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Ensure current directory and parent directory are in sys.path for module resolution
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

load_dotenv(os.path.join(current_dir, ".env"))
load_dotenv(os.path.join(current_dir, "..", ".env"))
load_dotenv(os.path.join(current_dir, "..", "frontend", ".env.local"))

from app.api import ai_routes
from app.api import pin_routes
from app.api import admin_routes
from app.api import ticket_routes
from app.services.scheduler import scheduler_loop
from app.services import admin_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start the recurring invoice scheduler in the background on server boot.
    The task is cancelled cleanly on shutdown."""
    task = asyncio.create_task(scheduler_loop())
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

app = FastAPI(title="MakInvoice Backend API", version="1.0.0", lifespan=lifespan)

allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
else:
    origins = [
        "https://makinvoices.com",
        "https://www.makinvoices.com",
        "https://makinvoices.in",
        "https://www.makinvoices.in",
        "http://localhost:3000"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_routes.router)
app.include_router(ai_routes.jobs_router)
app.include_router(pin_routes.router)
app.include_router(admin_routes.router)
app.include_router(ticket_routes.router)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Enterprise backend running smoothly"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
