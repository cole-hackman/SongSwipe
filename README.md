# SongSwipe

Tinder-style Rekordbox track culling for DJs. Swipe through a playlist, preview tracks and hot cues, rate and color-tag, then commit keep/cull decisions back to your Rekordbox library.

SongSwipe reads your local Rekordbox 7 `master.db`, lets you work through tracks quickly with waveforms and keyboard shortcuts, and writes back ratings, colors, and playlist membership when you are ready — without deleting files from disk.

## How it works

1. **Pick a source playlist** — normal or smart playlists from your Rekordbox library.
2. **Triage tracks** — swipe or use keyboard shortcuts to keep or cull. Preview audio, jump to hot cues, and skim with Intro / 32 bars / Drop / Outro presets.
3. **Review decisions** — edit ratings, colors, and per-track destination playlists before committing.
4. **Commit to Rekordbox** — write changes directly to `master.db` (with automatic backup), or export Rekordbox XML for manual import.

Cull means “add to cull playlist,” not “delete from disk.” Hot cues and beatgrids are read-only overlays.

## Features

### Core workflow

- **Tinder-style swipe deck** with keep/cull gestures and undo
- **Waveform player** with hot-cue regions, optional beatgrid downbeat overlay, and cached peaks for faster revisits
- **Transport bar** with play/pause, seek, hot-cue buttons, and skip presets
- **Rating and color tagging** during triage, written back on commit
- **Destination playlists** — global keep/cull targets plus per-track keep overrides
- **Session persistence** — auto-saves progress; named sessions with save/load/delete

### Session modes

| Mode | Purpose |
|------|---------|
| **Triage** | Swipe workflow with waveform, transport, and track controls |
| **Audit** | Scrollable list of all tracks with decision status and inline playback |
| **Compare** | A/B two tracks side by side for close listening |

### Smart assistance

- **Batch rules** — suggest keep/cull based on BPM, rating, or key (configurable in settings)
- **Playlist badges** — shows if a track is already in your keep or cull playlists
- **Duplicate detection** — clusters tracks by file path or artist+title
- **Track extras** — comment, play count, dates, and read-only My Tags
- **Stats dashboard** — keep ratio, average BPM, color distribution

### Commit and safety

- **Review queue** — edit or remove decisions before writing
- **Dry-run preview** — see planned DB operations without changing anything
- **XML export** — alternative commit path via Rekordbox XML import
- **Automatic backup** — timestamped copy of `master.db` (including WAL/SHM when present) before every commit
- **Rollback** — restore from recent backups in the commit dialog
- **Rekordbox status indicator** — live warning when Rekordbox is open (writes are blocked while RB is running)

SongSwipe never writes to `master.db` while Rekordbox is running.

### Input

- **Keyboard shortcuts** — fully rebindable in settings (press `?` for help)
- **Gamepad** — A=cull, B=keep, X=play (Xbox layout)
- **MIDI** — C2=cull, D2=keep, E2=play

### Performance

- Bulk track+cue fetch from the Rekordbox sidecar
- Batch file-existence checks and missing-file warnings
- Artwork URL cache and waveform peak cache
- Configurable waveform quality (bar width, normalize, fast mode)
- Audio prefetch window (default 5 ahead / 2 behind)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Electron app (React 19 + TypeScript + Zustand)         │
│  ┌─────────────┐  songswipe-media://  ┌──────────────┐  │
│  │  Renderer   │ ◄──────────────────► │  Main process │  │
│  │  (UI/audio) │       IPC            │  (fs, cache)  │  │
│  └──────┬──────┘                      └──────┬───────┘  │
│         │ JSON-RPC (stdio)                    │          │
│         ▼                                       ▼          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Python sidecar (rb-bridge / pyrekordbox 0.4.4)  │   │
│  │  Reads/writes Rekordbox 7 master.db              │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

- **Renderer** — swipe UI, wavesurfer.js waveforms, audio pool with prefetch
- **Main process** — custom `songswipe-media://` protocol, waveform peak cache, named sessions, export dialogs
- **Sidecar** — `rb_bridge.py` exposes Rekordbox operations over line-delimited JSON-RPC

Write scope is intentionally limited: **rating, color, and playlist membership only**. No hot-cue writes, no My Tags writes, no file deletion.

## Prerequisites

- **Node.js** 20+
- **Python** 3.11+ (development only; packaged builds bundle the sidecar)
- **Rekordbox 7.x** with a local library

## Setup

```bash
npm install --legacy-peer-deps
python3 -m venv .venv
.venv/bin/pip install -r sidecar/requirements.txt
```

Rekordbox 7 must be installed locally. [pyrekordbox](https://github.com/dylanljones/pyrekordbox) 0.4.4 unlocks `master.db` automatically — no separate key step required. If auto-detection fails, set `SONGSWIPE_DB_PATH` to your `master.db` path (also configurable in-app under Library settings).

Star ratings use Rekordbox's encoded scale (0, 51, 102, 153, 204, 255 for 0–5 stars) when reading and writing `master.db`.

## Development

```bash
npm run dev
```

## Production build

```bash
npm run build
```

Builds a PyInstaller `rb-bridge` binary (no system Python required in the packaged app) and packages it with electron-builder. Output goes to `release/<version>/`.

## Tests

```bash
npm run test:all      # Vitest (frontend) + pytest (sidecar)
npm run test          # Frontend only
npm run test:sidecar  # Sidecar only
npm run typecheck     # TypeScript
```

Integration tests against a real DB copy:

```bash
SONGSWIPE_TEST_DB=/path/to/master.db.copy npm run test:sidecar
```

## Keyboard shortcuts

Default bindings — customize in **Keyboard map** settings. Press `?` in-app for help.

| Key | Action |
|-----|--------|
| `←` / `→` | Cull / Keep (Triage mode) |
| `Space` | Play / Pause |
| `1`–`8` | Jump to hot cue |
| `Shift+1`–`Shift+5` | Set rating |
| `Z` | Undo last decision |
| `?` | Help overlay |

## Project structure

```
├── electron/           Main process, preload, IPC, caches
│   └── main/
├── src/                React renderer
│   ├── audio/          Audio pool, waveform, gamepad/MIDI
│   ├── components/     UI (swipe deck, commit dialog, etc.)
│   ├── lib/            Types, keymap, batch rules, IPC helpers
│   └── store/          Zustand stores (queue, decisions, settings)
├── sidecar/            Python Rekordbox bridge
│   ├── rb_bridge.py    JSON-RPC stdio server
│   ├── commands.py     Rekordbox read/write commands
│   └── tests/
├── test/               Vitest unit tests
└── docs/superpowers/plans/   Feature implementation plans
```

## Environment variables

| Variable | Purpose |
|----------|---------|
| `SONGSWIPE_DB_PATH` | Override path to Rekordbox `master.db` |
| `SONGSWIPE_TEST_DB` | Path to a DB copy for sidecar integration tests |

## License

MIT
