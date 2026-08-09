# SongSwipe

Tinder-style track culling for Rekordbox DJs — swipe through a playlist,
preview the parts that matter, tag as you go, then commit keep/cull decisions
back to your real library.

SongSwipe was built with a co-developer, not solo.
<!-- TODO: verify — name/handle and the what-I-built vs what-we-built split.
The commit history only contains Cole's commits, so this needs Cole's own
words. See README-QUESTIONS.md. -->

<!-- SCREENSHOT: the triage view — card stack with waveform, hot-cue markers,
and the decision rail. A short GIF of swipe → next card loading (with audio
prefetch making it instant) is the core loop. Keep under 5MB. -->

## The problem

DJ libraries grow faster than they get pruned. Deciding whether to keep a
track means listening to the right parts of it — the intro, the drop — and
Rekordbox makes that a slog: click a track, scrub around, open a menu to
rate or tag it, repeat a thousand times. Most DJs just stop pruning.
SongSwipe turns the decision into a swipe loop: hot-cue-aware preview
presets (Intro / 32 bars / Drop / Outro), one-gesture keep/cull, ratings and
tags inline, and a batch write-back at the end. "Cull" means added to a cull
playlist — nothing is ever deleted from disk.

## How it works

- An Electron + React desktop app for the UI and audio: wavesurfer.js
  waveforms with cue and beatgrid markers, a local media protocol for
  playback, and an audio prefetch window so the next card plays instantly.
- A Python sidecar is the only thing that touches Rekordbox. It speaks
  line-delimited JSON-RPC over stdio and uses pyrekordbox with SQLCipher to
  open Rekordbox 7's encrypted `master.db`. librosa powers smart cue
  placement (onset detection plus MFCC clustering for section boundaries).
- The Electron main process enforces a method allowlist between the renderer
  and the sidecar — the UI can only invoke a fixed set of commands.
- Decisions accumulate in an auto-saved session. Commit writes ratings,
  colors, My Tags, and playlist membership in one batch — after a
  timestamped backup of `master.db` (including WAL/SHM), with a dry-run
  preview first and rollback from the commit dialog. Rekordbox XML export
  exists as the no-write alternative.
- Writes are refused while Rekordbox is running (live process check), and
  write scope is deliberately narrow: rating, color, My Tags, playlist
  membership. Hot cues and beatgrids are read-only overlays.

## Running it

Requires Rekordbox 7 with your library on the same machine — SongSwipe
reads and writes your real database and can't run without it. There is a
packaged Windows installer (unsigned; SmartScreen will warn), or from
source with Node and Python installed:

    git clone https://github.com/cole-hackman/SongSwipe
    cd SongSwipe
    npm run setup   # installs JS deps and provisions the Python sidecar
    npm run dev

`setup-mac.command` / `setup-windows.bat` do the same by double-click.
Tests: `npm run test:all` runs the vitest suite and the sidecar pytest
suite.

## Scope and non-goals

**In scope:** triaging one playlist at a time — swipe, audit-list, and A/B
compare modes; ratings, colors, My Tags; duplicate detection; batch
keep/cull rules; commit to Rekordbox or XML.

**Not in scope:**

- Deleting audio files. Culling adds to a playlist; disk is never touched.
- Writing hot cues or beatgrids. Read-only overlays, by design.
- Other DJ software (Serato, Traktor) or streaming libraries. Rekordbox 7's
  local database only.

## Tradeoffs

**Writing directly to `master.db` instead of XML-only.** Rekordbox's
database is encrypted and undocumented; the supported integration path is
XML import. Direct writes bought a one-click commit — decisions land in the
library you'll open tomorrow, no import step. The cost is coupling to a
reverse-engineered schema and key via a pinned pyrekordbox version, which a
Rekordbox update can break at any time. The mitigations are layered:
automatic timestamped backups, dry-run preview, rollback, a refusal to write
while Rekordbox runs, and the XML path kept as the escape hatch.

**A Python sidecar over stdio instead of a pure-Node app.** The Python
ecosystem is the whole reason: pyrekordbox for the database, librosa for
audio analysis — neither has a Node equivalent worth trusting. The cost is
process management, an IPC boundary, and shipping a PyInstaller-bundled
Python runtime per platform, which is the most fragile part of the build.
The allowlist in the Electron main process keeps that boundary narrow.

## Known limitations and failure modes

- The entire write path depends on Rekordbox's reverse-engineered schema and
  encryption key. A Rekordbox update can break reads and writes overnight;
  recovery is the backups and the XML export path.
- Smart cue placement is heuristic. Onset plus MFCC section clustering works
  on conventionally structured dance music and misplaces cues on tracks
  without clear percussive sections.
- CI lints Markdown; nothing runs the tests on push. The sidecar pytest
  suite (15 files) and the vitest suite run locally via `npm run test:all`,
  plus a manual checklist in `docs/manual-test.md`.
- Installers are unsigned — Windows SmartScreen and macOS Gatekeeper both
  warn. Expected, but it costs trust at exactly the moment the app asks to
  touch someone's library.
- Packaging librosa/soundfile with PyInstaller is per-platform fragile; the
  Build workflow produces artifacts but nothing smoke-tests them.

## What I'd do next

1. Make CI run `test:all` — the suites exist and pass locally; nothing
   executes them on push.
2. Code-sign the installers. The SmartScreen warning is the worst possible
   first impression for an app that writes to your DJ library.
3. A ground-truth fixture set for smart cues — real tracks with
   hand-labeled sections — so cue-placement changes can be evaluated
   instead of eyeballed.

## Stack

Electron · React 19 · TypeScript · Vite · Zustand · wavesurfer.js · Python
sidecar (pyrekordbox, librosa, SQLCipher) · PyInstaller · electron-builder
