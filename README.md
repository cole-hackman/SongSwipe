# SongSwipe

Tinder-style Rekordbox track culling for DJs. Swipe through a playlist, preview tracks and hot cues, rate and color-tag, then commit keep/cull decisions back to your Rekordbox library.

SongSwipe reads your local Rekordbox 7 `master.db`, lets you work through tracks quickly with waveforms and keyboard shortcuts, and writes back ratings, colors, My Tags, and playlist membership when you are ready — without deleting files from disk.

## How it works

1. **Pick a source playlist** — normal or smart playlists from your Rekordbox library.
2. **Triage tracks** — swipe or use keyboard shortcuts to keep or cull. Preview audio, jump to hot cues, and skim with Intro / 32 bars / Drop / Outro presets.
3. **Review decisions** — edit ratings, colors, and per-track destination playlists before committing.
4. **Commit to Rekordbox** — write changes directly to `master.db` (with automatic backup), or export Rekordbox XML for manual import.

Cull means “add to cull playlist,” not “delete from disk.” Hot cues and beatgrids are read-only overlays.

## Features

### Core workflow

- **Tinder-style swipe deck** with keep/cut gestures and undo
- **Waveform player** with hot-cue regions, optional beatgrid downbeat overlay, cached peaks, and de-duplicated cue+preset markers
- **Transport bar** with play/pause, seek, hot-cue buttons, and skip presets
- **Rating, color, and My Tags tagging** during triage, written back on commit (My Tags shown grouped by category, just like Rekordbox)
- **Destination playlists** — global keep/cut targets plus per-track keep overrides
- **Session persistence** — auto-saves progress; named sessions with save/load/delete
- **Card stack triage layout** — interactive front card with decorative depth layers, three-zone top bar, collapsible playlist drawer, right decision rail, and drawer-based session/settings panels
- **Keyboard hint** — persistent footer pill showing current key bindings (Triage mode)

### Session modes

| Mode | Purpose |
|------|---------|
| **Triage** | Swipe workflow with waveform, transport, and track controls |
| **Audit** | Scrollable, configurable-column list of all tracks with decision status, inline playback, and sortable metadata (comment, play count, dates, file type) |
| **Compare** | A/B two tracks side by side for close listening |

### Smart assistance

- **Batch rules** — suggest keep/cull based on BPM, rating, or key (configurable in settings)
- **Playlist badges** — shows if a track is already in your keep or cull playlists
- **Duplicate detection** — clusters tracks by file path or artist+title
- **Track extras** — comment, play count, dates, and My Tags (view and assign, grouped by category)
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

- **Renderer** — triage swipe UI with drawer-based panels, card stack, wavesurfer.js waveforms with cue/beatgrid markers, audio pool with prefetch
- **Main process** — custom `songswipe-media://` protocol, waveform peak cache, named sessions, export dialogs
- **Sidecar** — `rb_bridge.py` exposes Rekordbox operations over line-delimited JSON-RPC

Write scope is intentionally limited: **rating, color, My Tags, and playlist membership only**. No hot-cue writes, no file deletion.

### Design

Dark theme with a curated token palette (`--bg`, `--panel`, `--line`, `--txt`, etc.) defined in `src/styles/tokens.css`. The UI uses **Archivo** (display/UI) and **IBM Plex Mono** (monospace) fonts, bundled via `@fontsource` packages — no external network requests for type.

## Install & set up

> **You need Rekordbox 7 installed with your library on this computer.** SongSwipe reads and writes your real Rekordbox database — it can't run without it.

SongSwipe currently runs from source, which needs two free tools installed once: **Node.js** and **Python**. After that, a single setup step installs everything else. Follow the guide for your operating system below.

<details open>
<summary><b>🪟 Windows — step by step</b></summary>

**1. Install Node.js**
- Go to <https://nodejs.org> and click the big green **LTS** button to download.
- Open the downloaded file and click **Next** through the installer (the defaults are fine).

**2. Install Python**
- Go to <https://www.python.org/downloads/> and click **Download Python**.
- Open the downloaded file. **On the very first screen, tick the box that says “Add python.exe to PATH.”** (This is important.) Then click **Install Now**.

**3. Download SongSwipe**
- On the SongSwipe GitHub page, click the green **Code** button → **Download ZIP**.
- Find the ZIP in your Downloads, **right-click it → Extract All**. You’ll get a `SongSwipe` folder.

**4. Install SongSwipe**
- Open the `SongSwipe` folder and **double-click `setup-windows.bat`**.
- A black window opens and installs everything. This takes a few minutes — wait until it says **“Done!”**
- If Windows shows a blue “Windows protected your PC” box, click **More info → Run anyway**.

**5. Start SongSwipe**
- **Double-click `start-windows.bat`.** The app opens. Keep the black window open while you use it; close it to quit.

Next time you just double-click `start-windows.bat` — setup is only needed once.
</details>

<details>
<summary><b>🍎 Mac — step by step</b></summary>

**1. Install Node.js**
- Go to <https://nodejs.org> and click the big green **LTS** button to download.
- Open the downloaded file and click through the installer (the defaults are fine).

**2. Install Python**
- Go to <https://www.python.org/downloads/> and click **Download Python**.
- Open the downloaded file and click through the installer.

**3. Download SongSwipe**
- On the SongSwipe GitHub page, click the green **Code** button → **Download ZIP**.
- Double-click the ZIP in your Downloads to unzip it. You’ll get a `SongSwipe` folder.

**4. Install SongSwipe**
- Open the `SongSwipe` folder. **Right-click `setup-mac.command` → Open**, then click **Open** in the security prompt (right-click is needed only the first time).
- A Terminal window installs everything. This takes a few minutes — wait until it says **“Done!”**

**5. Start SongSwipe**
- **Right-click `start-mac.command` → Open** (again, only the first time needs right-click). The app opens. Keep the Terminal window open while you use it; close it to quit.
</details>

<details>
<summary><b>⌨️ Prefer the command line? (any OS)</b></summary>

Requires **Node.js 20+** and **Python 3.11+** already installed.

```bash
npm run setup   # creates the Python venv + installs all dependencies
npm run dev     # starts the app
```

`npm run setup` is the same on Windows, macOS, and Linux — it picks the right Python paths for your OS automatically.
</details>

### Finding your Rekordbox library

[pyrekordbox](https://github.com/dylanljones/pyrekordbox) 0.4.4 unlocks `master.db` automatically — no separate key step required. SongSwipe auto-detects the database in the usual Rekordbox location. If it can’t find it, set the path in-app under **Library settings**, or set the `SONGSWIPE_DB_PATH` environment variable to your `master.db`.

> **Close Rekordbox before committing changes.** SongSwipe never writes to `master.db` while Rekordbox is running, and it makes a timestamped backup before every commit.

Star ratings use Rekordbox’s encoded scale (0, 51, 102, 153, 204, 255 for 0–5 stars) when reading and writing `master.db`.

## Building a standalone app (for distribution)

The steps above run SongSwipe from source. To produce a **double-click installer that end users can run with no Node, Python, or setup at all**, build it on the target OS:

```bash
npm run build
```

This bundles the Python sidecar into a standalone `rb-bridge` binary with PyInstaller and packages the app with electron-builder. Output goes to `release/<version>/` (a `.exe` installer on Windows, a `.dmg` on macOS). Because the sidecar binary is platform-specific, run `npm run build` **on each OS** you want to ship.

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

Default bindings — customize in **Keyboard map** settings. Press `?` in-app for help. Triage mode also shows a persistent footer hint with your current bindings.

| Key | Action |
|-----|--------|
| `←` / `→` | Cut / Keep (Triage mode) |
| `Space` | Play / Pause |
| `1`–`8` | Jump to hot cue |
| `Shift+1`–`Shift+5` | Set rating |
| `Z` | Undo last decision |
| `?` | Help overlay |

## Project structure

```
├── electron/              Main process, preload, IPC, caches
│   └── main/
├── src/                   React renderer
│   ├── audio/             Audio pool, waveform, gamepad/MIDI
│   ├── components/        UI components
│   │   ├── triage/        Triage-mode layout (top bar, card stack, drawers, rails)
│   │   └── ...            Shared components (swipe deck, commit dialog, etc.)
│   ├── lib/               Types, keymap, batch rules, cue presets, waveform markers,
│   │                      audit columns, IPC helpers
│   ├── store/             Zustand stores (queue, decisions, settings)
│   └── styles/            CSS tokens, global styles, triage layout
├── sidecar/               Python Rekordbox bridge
│   ├── rb_bridge.py       JSON-RPC stdio server
│   ├── commands.py        Rekordbox read/write commands
│   └── tests/
├── test/                  Vitest unit tests
│   ├── components/
│   ├── electron/
│   └── lib/
└── docs/superpowers/plans/   Feature implementation plans
```

## Environment variables

| Variable | Purpose |
|----------|---------|
| `SONGSWIPE_DB_PATH` | Override path to Rekordbox `master.db` |
| `SONGSWIPE_TEST_DB` | Path to a DB copy for sidecar integration tests |

## License

MIT
