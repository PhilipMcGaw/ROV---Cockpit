@echo off
setlocal EnableExtensions
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "PYTHON=%PROJECT_ROOT%\runtime\python.exe"
if "%SCRIPT_DIR:~0,2%"=="\\" ( echo This app cannot run from a UNC network path. & pause & exit /b 1 )
if not exist "%PYTHON%" ( echo Run scripts\1_install_dependencies.bat first. & pause & exit /b 1 )
cd /d "%PROJECT_ROOT%"
echo Starting ROV Cockpit at http://127.0.0.1:8080 using NATS Core.
start "ROV Cockpit" http://127.0.0.1:8080
set "PYTHONPATH=src"
"%PYTHON%" -m uvicorn rov_cockpit.app:app --host 127.0.0.1 --port 8080
pause
