import os
import sys
from dotenv import load_dotenv

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
parent_dir = os.path.dirname(backend_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

load_dotenv(os.path.join(backend_dir, ".env"))
load_dotenv(os.path.join(parent_dir, ".env"))
load_dotenv(os.path.join(parent_dir, "..", "frontend", ".env.local"))

try:
    from app.main import app
except ModuleNotFoundError:
    try:
        from backend.main import app
    except ModuleNotFoundError:
        from main import app

