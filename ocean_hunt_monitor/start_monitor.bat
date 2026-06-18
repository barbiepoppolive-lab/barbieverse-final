@echo off
REM Ocean Hunt Max Hit Monitor - Windows Launcher (Desktop Edition)
REM ================================================================
REM Double-click this file to start the monitor

echo.
echo ============================================
echo  Ocean Hunt Max Hit Monitor - Desktop Edition
echo ============================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found!
    echo Please install Python 3.12 or later.
    echo Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Navigate to script directory
cd /d "%~dp0"

REM Check if main.py exists
if not exist "main.py" (
    echo ERROR: main.py not found!
    echo Please run this script from the ocean_hunt_monitor directory.
    pause
    exit /b 1
)

REM Start the monitor
echo Starting Ocean Hunt Max Hit Monitor...
echo.
echo INSTRUCTIONS:
echo   1. Start your Android emulator (BlueStacks/NoxPlayer)
echo   2. Open Poppo Live and navigate to Ocean Hunt
echo   3. The system will auto-detect and capture the emulator
echo   4. Press Ctrl+C to stop
echo.
python main.py

pause
