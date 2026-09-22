@echo off
title INDRA Sovereign AI Workbench - Launcher
color 0A
cls

echo.
echo  ============================================================
echo   INDRA - Sovereign Multidisciplinary Engineering AI
echo   Smart India Hackathon 2026 - Problem Statement 26117
echo  ============================================================
echo.

:: ─── Map D: drive (no physical D:, maps to C:\) ───────────────────────────
subst D: C:\ >nul 2>&1
if exist "D:\models" (
    echo  [OK] D:\models drive mapped successfully
) else (
    echo  [WARN] D:\models mapping failed - check subst
)

:: ─── Free ports 8000 and 3000 if occupied ─────────────────────────────────
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

:: ─── Set Paths ─────────────────────────────────────────────
set "PROJECT=c:\Users\booya\OneDrive\Desktop\SIH260117-main"
set "PYTHON=C:\Users\booya\AppData\Local\Programs\Python\Python314\python.exe"
set "NODE_DIR=C:\Program Files\nodejs"
set "PATH=%NODE_DIR%;%PATH%"

:: Check Python
if not exist "%PYTHON%" (
    echo  [ERROR] Python not found at %PYTHON%
    pause & exit /b 1
)
echo  [OK] Python: %PYTHON%

:: Check Node.js
if exist "%NODE_DIR%\node.exe" (
    echo  [OK] Node.js found at %NODE_DIR%
    set "NPM_CMD=%NODE_DIR%\npm.cmd"
) else (
    where node >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo  [OK] Node.js found in PATH
        set "NPM_CMD=npm"
    ) else (
        echo  [WARN] Node.js not found
        set "NPM_CMD="
    )
)

:: ─── Check Frontend Location (prioritize updated SIH frontend 1) ───────────
if exist "C:\Users\booya\OneDrive\Desktop\SIH frontend 1\SIH frontend 1\katty\indra" (
    set "FRONTEND_DIR=C:\Users\booya\OneDrive\Desktop\SIH frontend 1\SIH frontend 1\katty\indra"
    echo  [OK] Using updated frontend from SIH frontend 1
) else (
    set "FRONTEND_DIR=%PROJECT%\frontend"
    echo  [OK] Using standard frontend
)

:: ─── Check GGUF model ──────────────────────────────────────────────────────
if exist "D:\models\qwen2.5-coder-1.5b-instruct-q4_k_m.gguf" (
    echo  [OK] GGUF model found at D:\models\
) else (
    echo  [WARN] GGUF model not found - will use transformer fallback
)

echo.
echo  Starting INDRA Backend (FastAPI :8000)...
start "INDRA Backend" cmd /k "title INDRA Backend && cd /d "%PROJECT%\backend" && "%PYTHON%" -m uvicorn main:app --host 0.0.0.0 --port 8000"

:: Wait for backend to initialize
echo  Waiting 4s for backend to initialize...
timeout /t 4 /nobreak >nul

:: ─── Start Frontend ────────────────────────────────────────────────────────
if defined NPM_CMD (
    echo  Starting INDRA Frontend (Next.js :3000)...
    start "INDRA Frontend" cmd /k "title INDRA Frontend && cd /d "%FRONTEND_DIR%" && set "PATH=%NODE_DIR%;%%PATH%%" && "%NPM_CMD%" run dev"
    
    echo  Waiting 6s for frontend server to bind...
    timeout /t 6 /nobreak >nul
    echo  Opening INDRA Workbench in browser...
    start "" "http://localhost:3000/workbench"
) else (
    echo  [WARN] Frontend skipped - Node.js not found
    echo  [INFO] Backend API available at: http://localhost:8000/docs
    start "" "http://localhost:8000/docs"
)

echo.
echo  ============================================================
echo   INDRA is running!
echo   Workbench:      http://localhost:3000/workbench
echo   Knowledge Base: http://localhost:3000/kb
echo   Audit Ledger:   http://localhost:3000/audit
echo   Backend API:    http://localhost:8000/docs
echo  ============================================================
echo.
pause
