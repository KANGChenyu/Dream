@echo off
setlocal
chcp 65001 >nul

echo [DreamLog] Stopping frontend process on port 5173...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do (
  taskkill /PID %%a /F >nul 2>nul
)

echo [DreamLog] Restarting frontend...
call "%~dp0start-frontend.bat"
