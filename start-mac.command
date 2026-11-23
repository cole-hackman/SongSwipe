#!/bin/bash
# Double-click this file to start SongSwipe on macOS.
# (If macOS blocks it the first time: right-click → Open, then confirm.)
cd "$(dirname "$0")" || exit 1
echo "Starting SongSwipe... keep this window open while you use the app."
echo "WARNING: this opens your REAL Rekordbox library. Commits and restores change"
echo "the collection Rekordbox opens. To try a copy instead, close this window and run"
echo "SONGSWIPE_DB_PATH=/path/to/copy/master.db npm run dev"
echo
export SONGSWIPE_ALLOW_REAL=1
npm run dev
