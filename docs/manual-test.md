# SongSwipe manual smoke test

Run these after `npm run dev`. **Fully quit and restart Electron** after any change to `electron/main/` (media protocol, sidecar).

## 0. Preconditions

- Rekordbox 7 installed; quit Rekordbox while testing (unlocks `master.db`).
- Python sidecar: `.venv/bin/pip install -r sidecar/requirements.txt`
- Optional: clear custom DB path in **Library** settings unless you intentionally use a copy.

## 1. Sidecar (terminal)

```bash
cd /Users/coleh/Desktop/SongSwipe
echo '{"id":1,"method":"ping","params":{}}' | .venv/bin/python sidecar/rb_bridge.py
echo '{"id":2,"method":"get_playlists","params":{}}' | .venv/bin/python sidecar/rb_bridge.py | head -c 400
```

Expect JSON with `"result":"pong"` and a playlist list.

## 2. App shell

1. Window opens with **SongSwipe** header (not a blank black screen).
2. Left column: **Playlists** tree with folders.
3. Right column: settings panels.
4. Bottom: **Play** button visible and clickable (not covered by toast).

## 3. Load a playlist

1. Expand a folder in the left nav.
2. Click a **playlist** (not a folder).
3. Center shows a track card; top-right shows `1 / N`.
4. If loading fails, a red banner explains why (sidecar/DB).

## 4. Cull / Keep

1. Click **Cull** or swipe card left.
2. Brief toast appears **above** the transport bar, then **auto-dismisses** (~2s).
3. Counter advances (`2 / N`). New track title on card.
4. **Play** remains clickable.
5. Press **Z** to undo; returns to previous track.

## 5. Playback (SSD / local file)

SongSwipe serves audio via a **localhost HTTP server** in the Electron main process (not `file://` or a custom URL scheme). After changing `electron/main/`, you **must fully quit and restart** the app.

1. Click **Play** (or press Space).
2. **Pass:** time counter moves; waveform progresses.
3. **Fail:** red banner with path + **×** to dismiss.

Verify the media server can read your file (Terminal):

```bash
# After app is running, check Electron terminal for: [media-server] listening on 127.0.0.1:XXXX
# Or run this standalone test:
npx tsx -e "
import { ensureMediaServer, toHttpMediaUrl, stopMediaServer } from './electron/main/media-server.ts';
await ensureMediaServer();
const url = toHttpMediaUrl('/Volumes/HACKMAN SSD/Tracks/your-track.mp3');
const res = await fetch(url, { headers: { Range: 'bytes=0-3' } });
console.log(res.status, await res.arrayBuffer());
stopMediaServer();
"
```

Expect status `206` and MP3 bytes (often starts with `ID3` or `0xff`).

## 6. Automated tests (terminal)

```bash
npm run test:all
npm run typecheck
```

All should pass.

## Known limitations

- Tracks whose files were moved/deleted show playback errors; Keep/Cull still works.
- Very large WAV on external SSD needs a **full app restart** after media-protocol changes.
- Smart playlists need to be opened once in Rekordbox to cache tracks.
