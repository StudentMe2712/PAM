@echo off
chcp 65001 >nul
REM ============================================================
REM  PAM - запуск всего стека для локальной разработки одним файлом.
REM  Открывает 3 окна: backend (FastAPI), web (Next.js), extension (Plasmo).
REM  БД - Neon (облако), читается из backend\.env. Локальный Postgres
REM  не нужен, пока Docker на паузе. Когда вернётся Docker - backend-окно
REM  заменяется на `docker compose up`.
REM
REM  Запуск: дважды кликнуть по файлу, либо `.\dev.bat` в терминале.
REM  Остановить: закрыть каждое из открывшихся окон (или Ctrl+C в нём).
REM ============================================================
setlocal
set "ROOT=%~dp0"

if not exist "%ROOT%backend\.venv\Scripts\python.exe" (
  echo [PAM] Не найден backend\.venv - сначала создай окружение:
  echo       py -3.11 -m venv backend\.venv
  echo       backend\.venv\Scripts\python -m pip install -e backend
  echo [PAM] Подробности - в handoff.md.
  pause
  exit /b 1
)

echo [PAM] Запускаю backend / web / extension в отдельных окнах...

start "PAM backend :8000" /D "%ROOT%backend" cmd /k ".venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
start "PAM web :3000"     /D "%ROOT%web"     cmd /k "npm run dev"
start "PAM extension"     /D "%ROOT%extension" cmd /k "npm run dev"

echo.
echo [PAM] Готово. Сервисы поднимаются в отдельных окнах:
echo       Backend : http://localhost:8000/docs
echo       Web UI  : http://localhost:3000
echo       Extension: extension\build\chrome-mv3-dev  (Load unpacked в chrome://extensions)
echo.
endlocal
