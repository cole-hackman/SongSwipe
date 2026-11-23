@echo off
REM Double-click this file to start SongSwipe on Windows.
cd /d "%~dp0"
echo Starting SongSwipe... (a window will open; keep this black window open while you use the app)
echo WARNING: this opens your REAL Rekordbox library. Commits and restores change
echo the collection Rekordbox opens. To try a copy instead, set SONGSWIPE_DB_PATH
echo and run npm run dev.
echo.
set SONGSWIPE_ALLOW_REAL=1
call npm run dev
pause
