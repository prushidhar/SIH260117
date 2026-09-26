@echo off
title INDRA — Native Sovereign Desktop App (Electron)
echo ===================================================
echo  Starting INDRA Sovereign AI Workbench Desktop App
echo  Native IPC Bridge ^| Direct FS Read ^| OS Notifications
echo ===================================================
set "PATH=C:\Users\lokes\node-v20.18.0-win-x64;C:\Program Files\nodejs;%PATH%"
set "NEXT_TELEMETRY_DISABLED=1"
cd /d "%~dp0indra"
echo Launching Electron Native Desktop Container...
npm run electron
pause
