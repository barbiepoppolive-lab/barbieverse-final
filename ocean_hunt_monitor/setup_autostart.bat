@echo off
REM Ocean Hunt Max Hit Monitor - Auto-Start Setup
REM ================================================
REM This script creates a Windows Task Scheduler task
REM to auto-start the monitor when Windows boots

echo.
echo ============================================
echo  Setting up Auto-Start for Ocean Hunt Monitor
echo ============================================
echo.

REM Check for admin privileges
net session >nul 2>&1
if errorlevel 1 (
    echo This script needs to run as Administrator.
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

REM Get the script directory
set "SCRIPT_DIR=%~dp0"
set "PYTHON_PATH=python"
set "MAIN_SCRIPT=%SCRIPT_DIR%main.py"
set "LOG_DIR=%SCRIPT_DIR%logs"
set "TASK_NAME=OceanHuntMonitor"

REM Create log directory if it doesn't exist
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

REM Create the scheduled task
echo Creating scheduled task: %TASK_NAME%
schtasks /create /tn "%TASK_NAME%" /tr "\"%PYTHON_PATH%\" \"%MAIN_SCRIPT%\"" /sc onstart /ru "%USERNAME%" /rl highest /f

if errorlevel 1 (
    echo.
    echo ERROR: Failed to create scheduled task.
    echo Please run this script as Administrator.
    pause
    exit /b 1
)

echo.
echo ============================================
echo  Auto-Start Setup Complete!
echo ============================================
echo.
echo Task created: %TASK_NAME%
echo Trigger: On Windows startup
echo Script: %MAIN_SCRIPT%
echo.
echo The monitor will now start automatically when Windows boots.
echo.
echo To test: Restart your computer and check if the monitor starts.
echo.
echo To remove this auto-start:
echo   schtasks /delete /tn "%TASK_NAME%" /f
echo.
pause
