@echo off
cd /d "%~dp0"
set "PATH=C:\Users\Hamilton\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%PATH%"
start "Servidor Condo+" /min cmd /c ""C:\Users\Hamilton\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd" preview --host 127.0.0.1 --port 4173"
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:4173/"
