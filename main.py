import os
import sys

dir_path = os.path.dirname(os.path.abspath(__file__))
if dir_path not in sys.path:
    sys.path.insert(0, dir_path)

backend_dir = os.path.join(dir_path, "backend")
if os.path.exists(backend_dir) and backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from backend.main import app
except ModuleNotFoundError:
    from main import app

