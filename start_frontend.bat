@echo off
title Employee360 AI - Frontend Dashboard (Port 3000)
cd /d "%~dp0frontend"

echo ========================================================
echo   EMPLOYEE360 AI - FRONTEND LAUNCHER
echo   Vite + React 19 + Executive White Theme (Port 3000)
echo ========================================================

echo Starting Vite development server on http://localhost:3000...
npm run dev
pause
