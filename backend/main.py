from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import asyncio
from app.api import ai_routes
from app.api import pin_routes
from app.services.scheduler import scheduler_loop

load_dotenv()

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

import os

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

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Enterprise backend running smoothly"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
