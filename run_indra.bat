@echo off
title INDRA — Sovereign AI Workbench
echo Starting INDRA Sovereign AI Workbench...
set "PATH=C:\Users\lokes\node-v20.18.0-win-x64;C:\Program Files\nodejs;%PATH%"
set "NEXT_TELEMETRY_DISABLED=1"
cd /d "%~dp0indra"
echo Opening browser at http://localhost:3000...
start http://localhost:3000
npm run dev
pause
