#!/bin/bash
# Double-click this file to start SongSwipe on macOS.
# (If macOS blocks it the first time: right-click → Open, then confirm.)
cd "$(dirname "$0")" || exit 1
echo "Starting SongSwipe... keep this window open while you use the app."
echo
npm run dev
