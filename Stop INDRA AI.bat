@echo off
title Stop INDRA AI
echo.
echo Stopping INDRA AI background services...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
echo [OK] INDRA AI background services stopped cleanly.
timeout /t 2 /nobreak >nul
