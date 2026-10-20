@echo off
title Employee360 AI - Backend Server (Port 8000)
cd /d "%~dp0"

echo ========================================================
echo   EMPLOYEE360 AI - BACKEND LAUNCHER
echo   FastAPI + SQLite + RAG Grounding Engine (Port 8000)
echo ========================================================

if not exist ".venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found at .venv. Please create one.
    pause
    exit /b 1
)

call .venv\Scripts\activate.bat
set PYTHONPATH=.

echo [1/2] Seeding initial database tables & demo candidates...
python -m backend.seed.seed_data

echo [2/2] Starting Uvicorn API server on http://127.0.0.1:8000...
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
pause
