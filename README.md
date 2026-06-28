# SongSwipe

Tinder-style Rekordbox track culling for DJs. Swipe through a playlist, preview tracks and hot cues, rate/color tag, and commit keep/cull decisions back to Rekordbox.

## Prerequisites

- Node.js 20+
- Python 3.11+
- Rekordbox 7.x with a local library

## Setup

```bash
npm install --legacy-peer-deps
python3 -m venv .venv
.venv/bin/pip install -r sidecar/requirements.txt
python -m pyrekordbox download-key
```

If Rekordbox cannot unlock automatically, set `SONGSWIPE_DB_PATH` to your `master.db` path.

## Development

```bash
npm run dev
```

## Tests

```bash
npm run test:all
```

## Commit safety

SongSwipe never writes to `master.db` while Rekordbox is running. Every commit creates a timestamped backup first.

## Keyboard shortcuts

- `←` / `→` — cull / keep
- `Space` — play / pause
- `1-8` — jump to hot cue
- `Shift+1-5` — set rating
- `Z` — undo
- `?` — help
