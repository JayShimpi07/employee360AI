@echo off
title Employee360 AI - Complete Presentation System
cd /d "%~dp0"

echo ========================================================
echo   EMPLOYEE360 AI - DUAL SYSTEM LAUNCHER
echo   Launching Backend (Port 8000) & Frontend (Port 3000)
echo ========================================================

start "Employee360 Backend" cmd /k "start_backend.bat"
timeout /t 3 >nul
start "Employee360 Frontend" cmd /k "start_frontend.bat"

echo.
echo Both services launched in separate windows!
echo   - Backend Swagger Docs: http://127.0.0.1:8000/docs
echo   - Frontend Enterprise UI: http://localhost:3000
echo.
pause
