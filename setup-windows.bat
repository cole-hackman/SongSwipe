@echo off
REM Double-click this file to install everything SongSwipe needs on Windows.
cd /d "%~dp0"
echo ============================================
echo   SongSwipe - one-time setup (Windows)
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js is not installed.
  echo     Download and install it from https://nodejs.org  ^(choose the "LTS" version^)
  echo     Then run this file again.
  echo.
  pause
  exit /b 1
)

where python >nul 2>nul
if errorlevel 1 (
  echo [X] Python is not installed.
  echo     Download and install it from https://www.python.org/downloads/
  echo     IMPORTANT: on the first screen, tick "Add python.exe to PATH".
  echo     Then run this file again.
  echo.
  pause
  exit /b 1
)

echo Installing... this can take a few minutes. Please wait.
echo.
call npm run setup
if errorlevel 1 (
  echo.
  echo Setup did not finish. Please screenshot the messages above for help.
  pause
  exit /b 1
)

echo.
echo Done! You can now start SongSwipe by double-clicking start-windows.bat
echo.
pause
