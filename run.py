import subprocess, sys, os
from pathlib import Path

root=Path(__file__).resolve().parent
frontend=root/"frontend"/"dist"
if not frontend.exists():
    print("frontend/dist not found. Run: cd frontend && npm install && npm run build")
subprocess.run([sys.executable,"-m","uvicorn","backend.app.main:app","--host","127.0.0.1","--port","8000"])
