@echo off
title INDRA Sovereign AI Workbench — Desktop Launcher
color 0B
echo ========================================================
echo   INDRA SOVEREIGN AI WORKBENCH - CONTROL CENTER
echo ========================================================
echo.

cd /d "%~dp0"

:: Auto-mount virtual drive D: if missing
if not exist "D:\models" (
    echo [System] Mounting D:\models via subst...
    if not exist "C:\models" mkdir "C:\models"
    subst D: C:\ >nul 2>&1
)

echo [System] Starting Desktop App...
start "" pythonw desktop_launcher.py
if %ERRORLEVEL% NEQ 0 (
    python desktop_launcher.py
)
