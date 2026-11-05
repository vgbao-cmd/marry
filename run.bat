@echo off
setlocal EnableExtensions DisableDelayedExpansion
pushd "%~dp0"
if errorlevel 1 goto root_error
where node >nul 2>&1
if errorlevel 1 goto node_error
node "scripts\check-node.cjs"
if errorlevel 1 goto fail
where npm >nul 2>&1
if errorlevel 1 goto node_error
call npm --version
if errorlevel 1 goto node_error
if not exist ".venv\Scripts\python.exe" goto setup_error
".venv\Scripts\python.exe" "scripts\windows_tools.py" dependencies
if errorlevel 1 goto fail
if /I "%~1"=="--backend" goto backend
if /I "%~1"=="--frontend" goto frontend
".venv\Scripts\python.exe" "scripts\windows_tools.py" ports 8000 5173
if errorlevel 1 goto fail
start "Marry Live - Backend" "%ComSpec%" /D /V:OFF /K call "%~f0" --backend
if errorlevel 1 goto fail
start "Marry Live - Frontend" "%ComSpec%" /D /V:OFF /K call "%~f0" --frontend
if errorlevel 1 goto fail
echo.
echo Two CMD windows were opened. Wait for both servers to report ready.
echo Admin: http://127.0.0.1:5173/admin
echo Stage: http://127.0.0.1:5173/stage
echo Demo:  http://127.0.0.1:5173/demo
echo Backend health: http://127.0.0.1:8000/api/health
echo Admin password: backend\data\admin-password.txt, unless set in .env.
echo Stop each server with Ctrl+C in its own window. No dependencies are reinstalled.
popd
pause
exit /b 0
:backend
".venv\Scripts\python.exe" "scripts\windows_tools.py" ports 8000
if errorlevel 1 goto fail
echo Backend: http://127.0.0.1:8000/api/health
if exist ".env" goto backend_env
".venv\Scripts\python.exe" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
set "MARRY_EXIT=%errorlevel%"
goto stopped
:backend_env
".venv\Scripts\python.exe" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --env-file ".env"
set "MARRY_EXIT=%errorlevel%"
goto stopped
:frontend
".venv\Scripts\python.exe" "scripts\windows_tools.py" ports 5173
if errorlevel 1 goto fail
echo Admin: http://127.0.0.1:5173/admin
echo Stage: http://127.0.0.1:5173/stage
call npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
set "MARRY_EXIT=%errorlevel%"
:stopped
echo.
echo Server stopped with exit code %MARRY_EXIT%. Read any errors above.
popd
pause
exit /b %MARRY_EXIT%
:setup_error
echo [ERROR] Dependencies have not been set up. Run setup.bat first.
goto fail
:node_error
echo [ERROR] Node.js or npm is missing or unusable.
echo Install Node.js 24 LTS with npm from https://nodejs.org/ and reopen CMD.
goto fail
:root_error
echo [ERROR] Cannot open the folder containing run.bat.
pause
exit /b 1
:fail
echo [ERROR] Launch stopped. No unrelated process was terminated.
popd
pause
exit /b 1
