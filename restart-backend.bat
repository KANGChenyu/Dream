@echo off
setlocal
chcp 65001 >nul

echo [DreamLog] Stopping backend process on port 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
  taskkill /PID %%a /F >nul 2>nul
)

echo [DreamLog] Restarting backend...
call "%~dp0start-backend.bat"
