@echo off
rem Called inside the launcher's SETLOCAL; return a command, not a credential.
set "MARRY_PY="
where py >nul 2>&1
if errorlevel 1 goto try_python
py -3.12 -c "import sys; sys.exit(0 if sys.version_info[:2] == (3,12) else 1)" >nul 2>&1
if errorlevel 1 goto try_python
set "MARRY_PY=py -3.12"
exit /b 0
:try_python
where python >nul 2>&1
if errorlevel 1 goto missing
python -c "import sys; sys.exit(0 if sys.version_info[:2] == (3,12) else 1)" >nul 2>&1
if errorlevel 1 goto missing
set "MARRY_PY=python"
exit /b 0
:missing
echo [ERROR] Python 3.12 was not found.
echo Install Python 3.12 from https://www.python.org/downloads/windows/
echo Include the Python launcher and "Add python.exe to PATH". Reopen CMD.
exit /b 1
