#!/bin/bash
# Double-click this file to install everything SongSwipe needs on macOS.
# (If macOS blocks it the first time: right-click → Open, then confirm.)
cd "$(dirname "$0")" || exit 1

echo "============================================"
echo "   SongSwipe - one-time setup (macOS)"
echo "============================================"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "[X] Node.js is not installed."
  echo "    Download and install it from https://nodejs.org  (choose the \"LTS\" version)"
  echo "    Then run this file again."
  echo
  read -n 1 -s -r -p "Press any key to close."
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "[X] Python is not installed."
  echo "    Download and install it from https://www.python.org/downloads/"
  echo "    Then run this file again."
  echo
  read -n 1 -s -r -p "Press any key to close."
  exit 1
fi

echo "Installing... this can take a few minutes. Please wait."
echo
if ! npm run setup; then
  echo
  echo "Setup did not finish. Please screenshot the messages above for help."
  read -n 1 -s -r -p "Press any key to close."
  exit 1
fi

echo
echo "Done! You can now start SongSwipe by double-clicking start-mac.command"
echo
read -n 1 -s -r -p "Press any key to close."
