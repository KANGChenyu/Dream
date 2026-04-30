@echo off
setlocal
chcp 65001 >nul

cd /d "%~dp0dreamlog-frontend"

if not exist "node_modules" (
  echo [DreamLog] Installing frontend dependencies...
  npm install
)

echo [DreamLog] Starting frontend at http://127.0.0.1:5173
echo [DreamLog] If .env.local was changed, this restart is required for Vite to reload API settings.
npm run dev -- --host 127.0.0.1 --port 5173

pause
