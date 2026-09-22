@echo off
color 0A
title Sovereign AI Workbench - Setup

echo ========================================================
echo   SOVEREIGN AI WORKBENCH - FIRST TIME SETUP
echo ========================================================
echo.

echo 1. Creating Python Virtual Environment...
cd backend
python -m venv venv

echo.
echo 2. Activating and Installing Dependencies...
call venv\Scripts\activate.bat
pip install -r requirements.txt
pip install autoawq

echo.
echo 3. Installing Frontend Dependencies...
cd ../frontend
npm install

echo.
echo ========================================================
echo Setup Complete! 
echo You can now double-click run_workbench.bat to start.
echo ========================================================
pause
