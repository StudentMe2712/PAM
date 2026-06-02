@echo off
REM ============================================================
REM  PAM - one-shot local dev launcher.
REM  Opens 3 windows: backend (FastAPI), web (Next.js), extension (Plasmo).
REM  DB is Neon (cloud), read from backend\.env. No local Postgres while
REM  Docker is paused; when Docker is back, replace the backend window
REM  with `docker compose up`.
REM
REM  Run: double-click this file, or `.\dev.bat` in a terminal.
REM  Stop: close each opened window (or Ctrl+C inside it).
REM  Comments/echo are ASCII on purpose - Cyrillic + chcp breaks cmd .bat.
REM ============================================================
setlocal
set "ROOT=%~dp0"

if not exist "%ROOT%backend\.venv\Scripts\python.exe" goto :noenv

echo [PAM] Starting backend / web / extension in separate windows...

start "PAM backend :8000" /D "%ROOT%backend" cmd /k ".venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
start "PAM web :3000" /D "%ROOT%web" cmd /k "npm run dev"
start "PAM extension" /D "%ROOT%extension" cmd /k "npm run dev"

echo.
echo [PAM] Backend  : http://localhost:8000/docs
echo [PAM] Web UI   : http://localhost:3000
echo [PAM] Extension: extension\build\chrome-mv3-dev  (Load unpacked in chrome://extensions)
echo.
echo [PAM] You can close this window.
goto :eof

:noenv
echo [PAM] backend\.venv not found. Create it first:
echo       py -3.11 -m venv backend\.venv
echo       backend\.venv\Scripts\python -m pip install -e backend
echo [PAM] See handoff.md for details.
pause
