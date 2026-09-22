@echo off
:: INDRA Silent Headless Launcher
subst D: C:\ >nul 2>&1

:: Free ports 8000 and 3000 first so Errno 10048 never happens
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

set "PROJECT=c:\Users\booya\OneDrive\Desktop\SIH260117-main"
set "PYTHON=C:\Users\booya\AppData\Local\Programs\Python\Python314\python.exe"
set "NODE_DIR=C:\Program Files\nodejs"
set "PATH=%NODE_DIR%;%PATH%"

:: Priority frontend check
if exist "C:\Users\booya\OneDrive\Desktop\SIH frontend 1\SIH frontend 1\katty\indra" (
    set "FRONTEND_DIR=C:\Users\booya\OneDrive\Desktop\SIH frontend 1\SIH frontend 1\katty\indra"
) else (
    set "FRONTEND_DIR=%PROJECT%\frontend"
)

:: 1. Start Backend in silent hidden background process
powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath '%PYTHON%' -ArgumentList '-m uvicorn main:app --host 0.0.0.0 --port 8000' -WorkingDirectory '%PROJECT%\backend' -WindowStyle Hidden"

:: 2. Start Frontend in silent hidden background process
powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath '%NODE_DIR%\npm.cmd' -ArgumentList 'run dev' -WorkingDirectory '%FRONTEND_DIR%' -WindowStyle Hidden"

:: 3. Wait for ports to initialize
timeout /t 6 /nobreak >nul

:: 4. Directly open INDRA Workbench in the user's browser
start "" "http://localhost:3000/workbench"
