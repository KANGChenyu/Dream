@echo off
setlocal
chcp 65001 >nul

cd /d "%~dp0dreamlog-backend"

if not exist ".venv\Scripts\python.exe" (
  echo [DreamLog] Backend virtual environment not found.
  echo [DreamLog] Please run install-backend-deps.bat first.
  pause
  exit /b 1
)

if not exist ".env" (
  echo [DreamLog] .env not found. Copying from .env.example...
  copy ".env.example" ".env" >nul
)

echo [DreamLog] Starting backend at http://127.0.0.1:8000
echo [DreamLog] API docs: http://127.0.0.1:8000/docs
set PYTHONUTF8=1
set PYTHONPATH=%CD%
".venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

pause
