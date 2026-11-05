@echo off
setlocal EnableExtensions DisableDelayedExpansion
pushd "%~dp0"
if errorlevel 1 goto root_error
where node >nul 2>&1
if errorlevel 1 goto node_error
node "scripts\check-node.cjs"
if errorlevel 1 goto fail
where npm >nul 2>&1
if errorlevel 1 goto npm_error
call npm --version
if errorlevel 1 goto npm_error
call "scripts\windows-python.cmd"
if errorlevel 1 goto fail
if exist ".venv\Scripts\python.exe" goto check_venv
if exist ".venv" goto venv_error
%MARRY_PY% -m venv ".venv"
if errorlevel 1 goto fail
:check_venv
".venv\Scripts\python.exe" -c "import sys; sys.exit(0 if sys.version_info[:2] == (3,12) and sys.prefix != sys.base_prefix else 1)"
if errorlevel 1 goto venv_error
".venv\Scripts\python.exe" -m pip install -r "backend\requirements.lock.txt"
if errorlevel 1 goto fail
call npm ci --no-audit --no-fund
if errorlevel 1 goto fail
call npm run build
if errorlevel 1 goto fail
if exist ".env" goto env_ready
".venv\Scripts\python.exe" "scripts\windows_tools.py" init-env
if errorlevel 1 goto fail
:env_ready
echo.
echo Setup complete. Existing .env files were preserved.
echo Start the application with run.bat. No PowerShell activation is needed.
popd
pause
exit /b 0
:node_error
echo [ERROR] Node.js was not found. Install Node.js 24 LTS from https://nodejs.org/
echo Include npm and PATH support, then reopen CMD.
goto fail
:npm_error
echo [ERROR] npm is missing or cannot run. Reinstall Node.js 24 LTS with npm.
goto fail
:venv_error
echo [ERROR] Existing .venv is not a working Windows Python 3.12 environment.
echo Move or remove that .venv directory yourself, then run setup.bat again.
goto fail
:root_error
echo [ERROR] Cannot open the folder containing setup.bat.
pause
exit /b 1
:fail
echo.
echo [ERROR] Setup stopped. Read the error above. No .env was overwritten.
popd
pause
exit /b 1
