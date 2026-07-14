@echo off
REM Double-click this file to start SongSwipe on Windows.
cd /d "%~dp0"
echo Starting SongSwipe... (a window will open; keep this black window open while you use the app)
echo.
call npm run dev
pause
