@echo off
setlocal
chcp 65001 >nul

cd /d "%~dp0dreamlog-backend"

if not exist ".venv\Scripts\python.exe" (
  echo [DreamLog] Creating backend virtual environment...
  py -3 -m venv .venv
)

echo [DreamLog] Installing backend dependencies...
set PYTHONUTF8=1
".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\python.exe" -m pip install -r requirements.txt

echo.
echo [DreamLog] Backend dependencies are ready.
pause
