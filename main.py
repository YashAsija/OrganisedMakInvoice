import os
import sys

# Add root directory to python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
# Add backend directory to python path if it exists
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if os.path.exists(backend_dir):
    sys.path.insert(0, backend_dir)

from backend.main import app
