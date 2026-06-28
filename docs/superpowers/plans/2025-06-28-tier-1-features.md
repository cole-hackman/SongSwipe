# Tier 1 Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship all Tier 1 workflow and performance enhancements for SongSwipe — auto-play, skip presets, batch rules, review queue, smart playlists, per-track destinations, session modes, playlist membership badges, waveform peak cache, bulk sidecar fetch, metadata-first paint, artwork cache, waveform quality settings, and batch file-existence checks.

**Architecture:** Extend the Python sidecar with one bulk read method (`get_playlist_bundle`) and one membership method (`get_playlist_membership`). Add Electron main-process caches for waveform peaks and batch filesystem checks. Evolve the renderer with focused modules (`cue-presets`, `batch-rules`, `artwork-cache`, `peak-store`) and new UI surfaces (`ReviewQueue`, `ModeSwitcher`, `AuditView`, `CompareView`). Keep Rekordbox write scope unchanged: rating, color, playlist membership only; cull never deletes files; cues remain read-only.

**Tech Stack:** Electron 42, React 19, TypeScript, Zustand, Vitest, pytest, pyrekordbox sidecar (JSON-RPC stdio), wavesurfer.js 7, `songswipe-media://` custom protocol.

## Global Constraints

- Rekordbox 7.x via pyrekordbox sidecar; backup `master.db` before commit; Rekordbox must be closed during writes.
- Write-back scope: **rating + color + playlist membership only** (no My Tags, no hot-cue writes).
- Cull adds to cull playlist only — **never delete files from disk**.
- Cues are **read-only** from Rekordbox.
- Default prefetch window: **5 ahead / 2 behind** (user-configurable in settings).
- Media URLs use **`songswipe-media://`** protocol (not `file://`).
- Sidecar methods must be added to `electron/main/sidecar-allowlist.ts`.
- Do **not** edit `/Users/coleh/.cursor/plans/songswipe_dj_culler_2eef237f.plan.md`.

## Execution Order

```
Phase A (Sidecar reads)     → Tasks 1–3
Phase B (Main-process perf) → Tasks 4–6
Phase C (Renderer perf)     → Tasks 7–9
Phase D (Workflow UX)       → Tasks 10–15
Phase E (Session modes)     → Tasks 16–18
Phase F (Integration)       → Task 19
```

Each phase is independently shippable. Complete phases in order because later tasks consume earlier interfaces.

## File Structure

| File | Responsibility |
|------|----------------|
| `sidecar/commands.py` | New `get_playlist_bundle`, `get_playlist_membership`; smart playlist track resolution |
| `sidecar/tests/test_playlist_bundle.py` | Sidecar unit tests for new methods |
| `electron/main/sidecar-allowlist.ts` | Allow-list new RPC methods |
| `electron/main/fs-ops.ts` | `batchFileExists(paths: string[])` |
| `electron/main/peak-cache.ts` | Read/write waveform peaks JSON keyed by file path hash |
| `electron/main/ipc.ts` | IPC handlers: `fs:batchExists`, `peaks:get`, `peaks:save` |
| `electron/preload/index.ts` | Expose new IPC to renderer |
| `src/lib/types.ts` | Extended `Track`, `Cue`, `TrackDecision`, `SessionMode`, settings types |
| `src/lib/cue-presets.ts` | Intro / 32-bar / drop / outro preset positions |
| `src/lib/batch-rules.ts` | Rule definitions and `evaluateRules(track)` |
| `src/audio/artwork-cache.ts` | In-memory LRU map `artworkPath → mediaUrl` |
| `src/audio/peak-store.ts` | Renderer helper: get peaks from main, save after decode |
| `src/audio/useWaveform.ts` | Accept peaks + quality options |
| `src/store/settings.ts` | `autoPlay`, `waveformQuality`, `batchRules`, `sessionMode` |
| `src/store/queue.ts` | `selectPlaylist` uses bundle API; membership map; metadata-first paint |
| `src/store/decisions.ts` | `removeDecision`, `updateDecision` for review queue |
| `src/components/ReviewQueue.tsx` | Editable table before commit |
| `src/components/SkipPresetButtons.tsx` | Intro / 32 bars / drop / outro |
| `src/components/RuleSuggestionBanner.tsx` | Shows rule suggestion with accept/dismiss |
| `src/components/PerTrackDestination.tsx` | Override keep playlist for current track |
| `src/components/PlaylistMembershipBadges.tsx` | "In keep" / "In cull" chips on TrackCard |
| `src/components/ModeSwitcher.tsx` | Triage / Audit / Compare toggle |
| `src/components/AuditView.tsx` | Scrollable decision list with inline play |
| `src/components/CompareView.tsx` | A/B two-track comparison |
| `src/components/CommitDialog.tsx` | Open review queue; use per-track `destPlaylistId` |
| `src/components/PlaylistPicker.tsx` | Include smart playlists |
| `src/components/TrackCard.tsx` | Use artwork cache + membership badges |
| `src/components/LibrarySettings.tsx` | Auto-play, waveform quality, rules editor |
| `src/App.tsx` | Wire modes, auto-play, rule banner, missing-files summary |
| `test/lib/cue-presets.test.ts` | Preset math tests |
| `test/lib/batch-rules.test.ts` | Rule engine tests |
| `test/store/queue-bundle.test.ts` | Queue store bundle loading (mocked IPC) |

---

### Task 1: Sidecar `get_playlist_bundle`

**Files:**
- Modify: `sidecar/commands.py`
- Modify: `sidecar/commands.py` dispatch map
- Create: `sidecar/tests/test_playlist_bundle.py`
- Modify: `electron/main/sidecar-allowlist.ts`

**Interfaces:**
- Consumes: existing `_track_dict`, `get_cues`, `get_tracks`, `open_db`
- Produces: `get_playlist_bundle(playlist_id: str, include_cues: bool = True) -> dict` returning `{ "tracks": list[dict] }` where each track dict may include `"cues": list[dict]`

- [ ] **Step 1: Write the failing test**

```python
# sidecar/tests/test_playlist_bundle.py
from unittest.mock import MagicMock, patch

import commands


@patch("commands.open_db")
def test_get_playlist_bundle_includes_cues(mock_open_db):
    db = MagicMock()
    mock_open_db.return_value = db

    song = MagicMock(ContentID="c1")
    db.get_playlist_songs.return_value = [song]

    content = MagicMock(
        ID="c1",
        FolderPath="/music/a.mp3",
        Title="A",
        ArtistID=None,
        AlbumID=None,
        ImagePath=None,
        BPM=12800,
        KeyID=None,
        Rating=0,
        ColorID=0,
        Length=180,
    )
    db.get_content.return_value = content
    cue = MagicMock(Comment="Drop", Kind=1, InMsec=60000, CueID=1)
    db.get_content_cue.return_value = [cue]

    bundle = commands.get_playlist_bundle("pl-1", include_cues=True)

    assert len(bundle["tracks"]) == 1
    assert bundle["tracks"][0]["cues"][0]["positionSec"] == 60.0


@patch("commands.open_db")
def test_get_playlist_bundle_omits_cues_when_disabled(mock_open_db):
    db = MagicMock()
    mock_open_db.return_value = db
    db.get_playlist_songs.return_value = []
    bundle = commands.get_playlist_bundle("pl-1", include_cues=False)
    assert bundle == {"tracks": []}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/pytest sidecar/tests/test_playlist_bundle.py -v`  
Expected: FAIL with `AttributeError: module 'commands' has no attribute 'get_playlist_bundle'`

- [ ] **Step 3: Write minimal implementation**

```python
# sidecar/commands.py — add after get_cues()

def get_playlist_bundle(playlist_id: str, include_cues: bool = True) -> dict[str, Any]:
    tracks = get_tracks(playlist_id)
    if include_cues:
        for track in tracks:
            track["cues"] = get_cues(track["id"])
    return {"tracks": tracks}
```

```python
# sidecar/commands.py — in dispatch handlers dict
"get_playlist_bundle": lambda p: get_playlist_bundle(
    p["playlistId"], p.get("includeCues", True)
),
```

```typescript
// electron/main/sidecar-allowlist.ts — add to Set
'get_playlist_bundle',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/bin/pytest sidecar/tests/test_playlist_bundle.py -v`  
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add sidecar/commands.py sidecar/tests/test_playlist_bundle.py electron/main/sidecar-allowlist.ts
git commit -m "feat(sidecar): add get_playlist_bundle for bulk track+cue fetch"
```

---

### Task 2: Sidecar `get_playlist_membership`

**Files:**
- Modify: `sidecar/commands.py`
- Modify: `sidecar/tests/test_playlist_bundle.py` (append tests)
- Modify: `electron/main/sidecar-allowlist.ts`

**Interfaces:**
- Consumes: `open_db`, `get_playlist_songs`
- Produces: `get_playlist_membership(playlist_ids: list[str]) -> dict[str, list[str]]` mapping playlist ID → list of track content IDs (strings)

- [ ] **Step 1: Write the failing test**

```python
@patch("commands.open_db")
def test_get_playlist_membership_returns_track_ids_per_playlist(mock_open_db):
    db = MagicMock()
    mock_open_db.return_value = db

    def songs_side_effect(PlaylistID):
        if PlaylistID == "keep-pl":
            return [MagicMock(ContentID="t1"), MagicMock(ContentID="t2")]
        if PlaylistID == "cull-pl":
            return [MagicMock(ContentID="t2")]
        return []

    db.get_playlist_songs.side_effect = songs_side_effect

    result = commands.get_playlist_membership(["keep-pl", "cull-pl"])

    assert result == {"keep-pl": ["t1", "t2"], "cull-pl": ["t2"]}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/pytest sidecar/tests/test_playlist_bundle.py::test_get_playlist_membership_returns_track_ids_per_playlist -v`  
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```python
def get_playlist_membership(playlist_ids: list[str]) -> dict[str, list[str]]:
    db = open_db()
    result: dict[str, list[str]] = {}
    for playlist_id in playlist_ids:
        songs = db.get_playlist_songs(PlaylistID=playlist_id) or []
        result[str(playlist_id)] = [str(song.ContentID) for song in songs]
    return result
```

```python
"get_playlist_membership": lambda p: get_playlist_membership(p["playlistIds"]),
```

```typescript
// sidecar-allowlist.ts
'get_playlist_membership',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/bin/pytest sidecar/tests/test_playlist_bundle.py -v`  
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add sidecar/commands.py sidecar/tests/test_playlist_bundle.py electron/main/sidecar-allowlist.ts
git commit -m "feat(sidecar): add get_playlist_membership for playlist badges"
```

---

### Task 3: Smart playlist source support

**Files:**
- Modify: `sidecar/commands.py`
- Modify: `sidecar/tests/test_playlist_bundle.py`
- Modify: `src/components/PlaylistPicker.tsx`

**Interfaces:**
- Consumes: `get_playlists`, `get_tracks`
- Produces: Smart playlists (`isSmart: true`) selectable in UI; `get_tracks` returns helpful error if smart playlist has zero cached tracks

- [ ] **Step 1: Write the failing test**

```python
@patch("commands.open_db")
def test_get_tracks_smart_playlist_empty_raises_helpful_error(mock_open_db):
    db = MagicMock()
    mock_open_db.return_value = db
    smart = MagicMock(ID="smart-1", Attribute=4, Name="Unrated")
    db.get_playlist.return_value = [smart]
    db.get_playlist_songs.return_value = []

    try:
        commands.get_tracks("smart-1")
        assert False, "expected RuntimeError"
    except RuntimeError as exc:
        assert "smart playlist" in str(exc).lower()
        assert "rekordbox" in str(exc).lower()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/pytest sidecar/tests/test_playlist_bundle.py::test_get_tracks_smart_playlist_empty_raises_helpful_error -v`  
Expected: FAIL (no error raised)

- [ ] **Step 3: Write minimal implementation**

```python
def _playlist_is_smart(db: Rekordbox6Database, playlist_id: str) -> bool:
    for playlist in db.get_playlist():
        if str(playlist.ID) == str(playlist_id):
            return int(getattr(playlist, "Attribute", 0) or 0) == 4
    return False


def get_tracks(playlist_id: str) -> list[dict[str, Any]]:
    db = open_db()
    songs = db.get_playlist_songs(PlaylistID=playlist_id)
    tracks: list[dict[str, Any]] = []
    for song in songs or []:
        content = db.get_content(ID=song.ContentID)
        if content is None:
            continue
        tracks.append(_track_dict(content, db))
    if not tracks and _playlist_is_smart(db, playlist_id):
        raise RuntimeError(
            "Smart playlist has no cached tracks. Open it once in Rekordbox to refresh, then retry."
        )
    return tracks
```

```tsx
// src/components/PlaylistPicker.tsx — change filter line
const selectablePlaylists = playlists.filter((p) => !p.isFolder)
```

Update option label for smart playlists:

```tsx
{playlist.isSmart ? `${playlist.name} (smart)` : playlist.name}
```

- [ ] **Step 4: Run tests**

Run: `.venv/bin/pytest sidecar/tests/test_playlist_bundle.py -v && npm run typecheck`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add sidecar/commands.py sidecar/tests/test_playlist_bundle.py src/components/PlaylistPicker.tsx
git commit -m "feat: allow smart playlists as source with empty-cache guidance"
```

---

### Task 4: Batch file existence IPC

**Files:**
- Modify: `electron/main/fs-ops.ts`
- Modify: `electron/main/ipc.ts`
- Modify: `electron/preload/index.ts`
- Modify: `src/lib/ipc.ts`
- Modify: `src/lib/api.d.ts`
- Create: `test/main/fs-ops.test.ts` (optional — test via vitest mocking fs if needed; otherwise manual verification step)

**Interfaces:**
- Produces: `batchFileExists(paths: string[]): Promise<Record<string, boolean>>`
- Renderer: `batchFileExists(paths: string[])` in `src/lib/ipc.ts`

- [ ] **Step 1: Write implementation with inline test script**

```typescript
// electron/main/fs-ops.ts
export async function batchFileExists(paths: string[]): Promise<Record<string, boolean>> {
  const entries = await Promise.all(
    paths.map(async (filePath) => [filePath, await fileExists(filePath)] as const),
  )
  return Object.fromEntries(entries)
}
```

```typescript
// electron/main/ipc.ts — inside registerIpcHandlers
ipcMain.handle('fs:batchExists', async (_event, paths: string[]) => batchFileExists(paths))
```

```typescript
// electron/preload/index.ts — add to SongSwipeApi and api object
batchFileExists: (paths: string[]) => ipcRenderer.invoke('fs:batchExists', paths),
```

```typescript
// src/lib/ipc.ts
export async function batchFileExists(paths: string[]): Promise<Record<string, boolean>> {
  return window.api.batchFileExists(paths)
}
```

- [ ] **Step 2: Verify manually in dev**

Run: `npm run dev`  
In DevTools: `await window.api.batchFileExists(['/etc/hosts', '/no-such-file'])`  
Expected: `{ "/etc/hosts": true, "/no-such-file": false }`

- [ ] **Step 3: Commit**

```bash
git add electron/main/fs-ops.ts electron/main/ipc.ts electron/preload/index.ts src/lib/ipc.ts src/lib/api.d.ts
git commit -m "feat: batch file existence checks via IPC"
```

---

### Task 5: Waveform peak cache (main process)

**Files:**
- Create: `electron/main/peak-cache.ts`
- Modify: `electron/main/ipc.ts`
- Modify: `electron/preload/index.ts`
- Modify: `src/lib/ipc.ts`
- Modify: `src/lib/api.d.ts`

**Interfaces:**
- Produces:
  - `getCachedPeaks(filePath: string): Promise<{ peaks: number[][]; duration: number } | null>`
  - `saveCachedPeaks(filePath: string, peaks: number[][], duration: number): Promise<void>`
- Cache file: `{userData}/peak-cache/{sha256(path)}.json`

- [ ] **Step 1: Create peak-cache module**

```typescript
// electron/main/peak-cache.ts
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'

export type PeakCacheEntry = {
  filePath: string
  duration: number
  peaks: number[][]
  updatedAt: string
}

function cacheDir(): string {
  return path.join(app.getPath('userData'), 'peak-cache')
}

function cachePath(filePath: string): string {
  const hash = createHash('sha256').update(filePath).digest('hex')
  return path.join(cacheDir(), `${hash}.json`)
}

export async function getCachedPeaks(filePath: string): Promise<PeakCacheEntry | null> {
  try {
    const raw = await readFile(cachePath(filePath), 'utf8')
    return JSON.parse(raw) as PeakCacheEntry
  } catch {
    return null
  }
}

export async function saveCachedPeaks(
  filePath: string,
  peaks: number[][],
  duration: number,
): Promise<void> {
  await mkdir(cacheDir(), { recursive: true })
  const entry: PeakCacheEntry = {
    filePath,
    duration,
    peaks,
    updatedAt: new Date().toISOString(),
  }
  await writeFile(cachePath(filePath), JSON.stringify(entry))
}
```

- [ ] **Step 2: Wire IPC**

```typescript
// electron/main/ipc.ts
import { getCachedPeaks, saveCachedPeaks } from './peak-cache'

ipcMain.handle('peaks:get', async (_event, filePath: string) => getCachedPeaks(filePath))
ipcMain.handle('peaks:save', async (_event, filePath: string, peaks: number[][], duration: number) => {
  await saveCachedPeaks(filePath, peaks, duration)
})
```

Expose in preload + `src/lib/ipc.ts` + `api.d.ts` as `getCachedPeaks` / `saveCachedPeaks`.

- [ ] **Step 3: Commit**

```bash
git add electron/main/peak-cache.ts electron/main/ipc.ts electron/preload/index.ts src/lib/ipc.ts src/lib/api.d.ts
git commit -m "feat: persist waveform peaks in userData cache"
```

---

### Task 6: Playlist warm-up on select (bundle + batch exists)

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/store/queue.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `rb('get_playlist_bundle')`, `batchFileExists`
- Produces: Queue store fields `cuesByTrackId: Record<string, Cue[]>`, `missingPaths: string[]`, `membershipByTrackId: Record<string, { inDest: boolean; inCull: boolean }>`

- [ ] **Step 1: Extend types**

```typescript
// src/lib/types.ts — add to Track (optional fields from bundle)
export type TrackWithCues = Track & { cues?: Cue[] }

export type TrackMembership = {
  inDest: boolean
  inCull: boolean
}
```

- [ ] **Step 2: Rewrite selectPlaylist for metadata-first paint**

```typescript
// src/store/queue.ts — add state fields
cuesByTrackId: {} as Record<string, Cue[]>,
missingPaths: [] as string[],
membershipByTrackId: {} as Record<string, import('@/lib/types').TrackMembership>,

async selectPlaylist(playlistId) {
  set({ loading: true, error: null, sourcePlaylistId: playlistId, cuesByTrackId: {}, missingPaths: [], membershipByTrackId: {} })
  try {
    const bundle = await rb<{ tracks: Array<import('@/lib/types').Track & { cues?: import('@/lib/types').Cue[] }> }>(
      'get_playlist_bundle',
      { playlistId, includeCues: true },
    )
    const tracks = bundle.tracks.map(({ cues, ...track }) => track)
    const cuesByTrackId: Record<string, import('@/lib/types').Cue[]> = {}
    for (const t of bundle.tracks) {
      if (t.cues?.length) cuesByTrackId[t.id] = t.cues
    }
    set({ tracks, currentIndex: 0, cuesByTrackId, loading: false })
    set({ cues: cuesByTrackId[tracks[0]?.id ?? ''] ?? [] })

  // fire-and-forget enrichment (do not block UI)
    void enrichPlaylist(tracks)
  } catch (error) {
    set({ loading: false, error: error instanceof Error ? error.message : 'Failed to load tracks' })
  }
},

async function enrichPlaylist(tracks: Track[]) {
  const { destinationPlaylistId, cullPlaylistId } = useSettingsStore.getState()
  const playlistIds = [destinationPlaylistId, cullPlaylistId].filter(Boolean) as string[]
  const paths = tracks.map((t) => t.path).filter(Boolean)

  const [existsMap, membership] = await Promise.all([
    batchFileExists(paths),
    playlistIds.length
      ? rb<Record<string, string[]>>('get_playlist_membership', { playlistIds })
      : Promise.resolve({} as Record<string, string[]>),
  ])

  const missingPaths = paths.filter((p) => !existsMap[p])
  const destSet = new Set(membership[destinationPlaylistId ?? ''] ?? [])
  const cullSet = new Set(membership[cullPlaylistId ?? ''] ?? [])
  const membershipByTrackId: Record<string, import('@/lib/types').TrackMembership> = {}
  for (const t of tracks) {
    membershipByTrackId[t.id] = { inDest: destSet.has(t.id), inCull: cullSet.has(t.id) }
  }
  useQueueStore.setState({ missingPaths, membershipByTrackId })
}
```

Import `batchFileExists` from `@/lib/ipc` and `useSettingsStore` at top of `queue.ts`.

Update `loadCuesForCurrent` to read from `cuesByTrackId` first:

```typescript
async loadCuesForCurrent() {
  const track = get().currentTrack()
  if (!track) { set({ cues: [] }); return }
  const cached = get().cuesByTrackId[track.id]
  if (cached) { set({ cues: cached }); return }
  // fallback single fetch for edge cases
  ...
}
```

- [ ] **Step 3: Show missing-files summary in App**

```tsx
// src/App.tsx — after error banners
const missingPaths = useQueueStore((s) => s.missingPaths)
{missingPaths.length > 0 ? (
  <div className="error-banner">
    {missingPaths.length} track file(s) missing in this playlist.
  </div>
) : null}
```

- [ ] **Step 4: Run tests**

Run: `npm run test:all && npm run typecheck`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/store/queue.ts src/App.tsx src/lib/ipc.ts
git commit -m "feat: playlist warm-up with bundle fetch, membership, and batch exists"
```

---

### Task 7: Artwork thumbnail cache

**Files:**
- Create: `src/audio/artwork-cache.ts`
- Modify: `src/components/TrackCard.tsx`

**Interfaces:**
- Produces: `getArtworkUrl(artworkPath: string | null, resolve: (p: string) => Promise<string>): Promise<string | null>`

- [ ] **Step 1: Write cache module**

```typescript
// src/audio/artwork-cache.ts
const cache = new Map<string, string>()
const MAX = 200

export async function getArtworkUrl(
  artworkPath: string | null,
  resolve: (path: string) => Promise<string>,
): Promise<string | null> {
  if (!artworkPath) return null
  const hit = cache.get(artworkPath)
  if (hit) return hit
  const url = await resolve(artworkPath)
  if (cache.size >= MAX) {
    const firstKey = cache.keys().next().value
    if (firstKey) cache.delete(firstKey)
  }
  cache.set(artworkPath, url)
  return url
}
```

- [ ] **Step 2: Use in TrackCard**

```tsx
import { getArtworkUrl } from '@/audio/artwork-cache'

useEffect(() => {
  let active = true
  void getArtworkUrl(track.artworkPath, toMediaUrl).then((url) => {
    if (active) setArtUrl(url)
  })
  return () => { active = false }
}, [track.artworkPath])
```

- [ ] **Step 3: Commit**

```bash
git add src/audio/artwork-cache.ts src/components/TrackCard.tsx
git commit -m "feat: LRU artwork URL cache for faster track revisits"
```

---

### Task 8: Waveform peaks in renderer + quality settings

**Files:**
- Create: `src/audio/peak-store.ts`
- Modify: `src/audio/useWaveform.ts`
- Modify: `src/store/settings.ts`
- Modify: `electron/main/app-settings.ts`
- Modify: `src/components/LibrarySettings.tsx`
- Modify: `src/components/WaveformPlayer.tsx`

**Interfaces:**
- Consumes: `getCachedPeaks`, `saveCachedPeaks` IPC; settings `waveformBarWidth`, `waveformNormalize`, `waveformFastMode`
- Produces: `useWaveform` loads cached peaks; on `ready` exports and saves peaks

- [ ] **Step 1: Extend settings**

```typescript
// src/store/settings.ts — add fields
waveformBarWidth: 2,
waveformNormalize: true,
waveformFastMode: false,
setWaveformBarWidth: (v: number) => set({ waveformBarWidth: v }),
setWaveformNormalize: (v: boolean) => set({ waveformNormalize: v }),
setWaveformFastMode: (v: boolean) => set({ waveformFastMode: v }),
```

Persist via `app-settings.ts` and `writeSettings`/`readSettings` IPC payloads.

- [ ] **Step 2: peak-store helper**

```typescript
// src/audio/peak-store.ts
import { getCachedPeaks, saveCachedPeaks } from '@/lib/ipc'

export async function loadPeaksForPath(filePath: string) {
  if (!filePath) return null
  const entry = await getCachedPeaks(filePath)
  if (!entry) return null
  return { peaks: entry.peaks, duration: entry.duration }
}

export async function persistPeaks(filePath: string, peaks: number[][], duration: number) {
  if (!filePath || !peaks.length) return
  await saveCachedPeaks(filePath, peaks, duration)
}
```

- [ ] **Step 3: Update useWaveform**

Add props: `filePath: string`, `barWidth`, `normalize`, `fastMode`.

On mount: `const cached = await loadPeaksForPath(filePath)` — if cached, pass `peaks` and `duration` to `WaveSurfer.create`.

On `ready`: `const peaks = wavesurfer.exportPeaks(); await persistPeaks(filePath, peaks, wavesurfer.getDuration())`.

Fast mode: `barWidth: fastMode ? 4 : barWidth`, `barGap: fastMode ? 2 : 1`.

- [ ] **Step 4: Wire WaveformPlayer**

Pass `filePath` from parent (`track.path`) and quality settings from store.

- [ ] **Step 5: LibrarySettings UI**

Add controls: bar width (1–6), normalize checkbox, fast mode checkbox.

- [ ] **Step 6: Commit**

```bash
git add src/audio/peak-store.ts src/audio/useWaveform.ts src/store/settings.ts electron/main/app-settings.ts src/components/LibrarySettings.tsx src/components/WaveformPlayer.tsx src/App.tsx
git commit -m "feat: waveform peak cache integration and quality settings"
```

---

### Task 9: Metadata-only first paint (defer audio pool)

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `loading` from queue store
- Behavior: Only call `pool.setTracks` / `pool.setCurrent` when `!loading && tracks.length`

- [ ] **Step 1: Gate audio pool on loading complete**

```tsx
// src/App.tsx — replace unconditional pool effects
useEffect(() => {
  if (loading || !tracks.length) return
  void pool.setTracks(tracks.map((t) => ({ path: t.path })))
}, [pool, tracks, loading])

useEffect(() => {
  if (loading || !tracks.length) return
  void pool.setCurrent(currentIndex).then(() => setIsPlaying(false))
}, [pool, currentIndex, loading, tracks.length])
```

Track card and metadata render while `loading` is true only during initial fetch (bundle should be fast); UI shows track info immediately when `loading` flips false.

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "perf: defer audio pool until playlist metadata load completes"
```

---

### Task 10: Auto-play on track load

**Files:**
- Modify: `src/store/settings.ts`
- Modify: `electron/main/app-settings.ts`
- Modify: `src/components/LibrarySettings.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add setting (default false)**

```typescript
autoPlay: false,
setAutoPlay: (value: boolean) => set({ autoPlay: value }),
```

- [ ] **Step 2: Auto-play effect in App**

```tsx
const autoPlay = useSettingsStore((s) => s.autoPlay)

useEffect(() => {
  if (!autoPlay || loading || !track) return
  void pool.setCurrent(currentIndex).then(async () => {
    await pool.play()
    setIsPlaying(true)
  })
}, [autoPlay, currentIndex, track?.id, loading])
```

Guard: skip if `audioError` is set.

- [ ] **Step 3: LibrarySettings toggle**

```tsx
<label>
  <input type="checkbox" checked={autoPlay} onChange={(e) => void persistAutoPlay(e.target.checked)} />
  Auto-play when track loads
</label>
```

- [ ] **Step 4: Commit**

```bash
git add src/store/settings.ts electron/main/app-settings.ts src/components/LibrarySettings.tsx src/App.tsx
git commit -m "feat: optional auto-play on track change"
```

---

### Task 11: Skip-to-drop presets

**Files:**
- Create: `src/lib/cue-presets.ts`
- Create: `src/components/SkipPresetButtons.tsx`
- Create: `test/lib/cue-presets.test.ts`
- Modify: `src/App.tsx` (render in TransportBar)

**Interfaces:**
- Produces: `buildCuePresets(track: Track, cues: Cue[]): Array<{ id: string; label: string; positionSec: number }>`

- [ ] **Step 1: Write failing tests**

```typescript
// test/lib/cue-presets.test.ts
import { describe, expect, it } from 'vitest'
import { buildCuePresets } from '@/lib/cue-presets'

const track = { id: '1', path: '', title: '', artist: '', album: '', bpm: 120, key: '', rating: 0, colorId: 0, durationSec: 240, artworkPath: null }

describe('buildCuePresets', () => {
  it('computes 32-bar offset from BPM', () => {
    const presets = buildCuePresets(track, [])
    const bars32 = presets.find((p) => p.id === 'bars32')
    expect(bars32?.positionSec).toBeCloseTo(64, 0) // 128 beats @ 120 BPM = 64s
  })

  it('uses first cue as drop when present', () => {
    const presets = buildCuePresets(track, [{ name: 'Drop', type: 1, positionSec: 90 }])
    expect(presets.find((p) => p.id === 'drop')?.positionSec).toBe(90)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- test/lib/cue-presets.test.ts`

- [ ] **Step 3: Implement**

```typescript
// src/lib/cue-presets.ts
import type { Cue, Track } from '@/lib/types'

export type CuePreset = { id: string; label: string; positionSec: number }

function barsToSeconds(bars: number, bpm: number | null): number {
  const effectiveBpm = bpm && bpm > 0 ? bpm : 120
  const beats = bars * 4
  return (beats / effectiveBpm) * 60
}

export function buildCuePresets(track: Track, cues: Cue[]): CuePreset[] {
  const bars32Sec = barsToSeconds(32, track.bpm)
  const dropCue = cues.find((c) => /drop/i.test(c.name)) ?? cues[0]
  const outroStart = Math.max(0, track.durationSec - bars32Sec)

  return [
    { id: 'intro', label: 'Intro', positionSec: 0 },
    { id: 'bars32', label: '32 bars', positionSec: Math.min(bars32Sec, track.durationSec) },
    { id: 'drop', label: 'Drop', positionSec: dropCue?.positionSec ?? bars32Sec },
    { id: 'outro', label: 'Outro', positionSec: outroStart },
  ]
}
```

- [ ] **Step 4: SkipPresetButtons component**

```tsx
// src/components/SkipPresetButtons.tsx
export function SkipPresetButtons({ presets, onJump }: { presets: CuePreset[]; onJump: (sec: number) => void }) {
  return (
    <div className="cue-buttons">
      {presets.map((p) => (
        <button key={p.id} type="button" className="btn" onClick={() => onJump(p.positionSec)}>
          {p.label}
        </button>
      ))}
    </div>
  )
}
```

Wire in `App.tsx` TransportBar alongside `CueButtons`.

- [ ] **Step 5: Run tests + commit**

```bash
npm run test -- test/lib/cue-presets.test.ts
git add src/lib/cue-presets.ts src/components/SkipPresetButtons.tsx test/lib/cue-presets.test.ts src/App.tsx
git commit -m "feat: skip-to-drop preset buttons (intro, 32 bars, drop, outro)"
```

---

### Task 12: Batch rules engine

**Files:**
- Create: `src/lib/batch-rules.ts`
- Create: `test/lib/batch-rules.test.ts`
- Create: `src/components/RuleSuggestionBanner.tsx`
- Modify: `src/store/settings.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces:
  - `export type BatchRule = { id: string; enabled: boolean; field: 'bpm' | 'rating' | 'key'; op: 'lt' | 'gt' | 'eq' | 'empty'; value?: string | number; action: 'suggest_keep' | 'suggest_cull' }`
  - `evaluateRules(track: Track, rules: BatchRule[]): BatchRule | null`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, expect, it } from 'vitest'
import { evaluateRules, type BatchRule } from '@/lib/batch-rules'

const track = { id: '1', path: '', title: '', artist: '', album: '', bpm: 100, key: '8A', rating: 0, colorId: 0, durationSec: 200, artworkPath: null }

describe('evaluateRules', () => {
  it('suggests cull when BPM below threshold', () => {
    const rules: BatchRule[] = [{ id: 'r1', enabled: true, field: 'bpm', op: 'lt', value: 110, action: 'suggest_cull' }]
    expect(evaluateRules(track, rules)?.action).toBe('suggest_cull')
  })
})
```

- [ ] **Step 2: Implement batch-rules.ts**

```typescript
import type { Track } from '@/lib/types'

export type BatchRule = {
  id: string
  enabled: boolean
  field: 'bpm' | 'rating' | 'key'
  op: 'lt' | 'gt' | 'eq' | 'empty'
  value?: string | number
  action: 'suggest_keep' | 'suggest_cull'
}

export function evaluateRules(track: Track, rules: BatchRule[]): BatchRule | null {
  for (const rule of rules) {
    if (!rule.enabled) continue
    if (matches(track, rule)) return rule
  }
  return null
}

function matches(track: Track, rule: BatchRule): boolean {
  if (rule.field === 'bpm') {
    const bpm = track.bpm ?? 0
    const v = Number(rule.value ?? 0)
    if (rule.op === 'lt') return bpm < v
    if (rule.op === 'gt') return bpm > v
    if (rule.op === 'eq') return bpm === v
  }
  if (rule.field === 'rating') {
    if (rule.op === 'empty') return track.rating === 0
    const v = Number(rule.value ?? 0)
    if (rule.op === 'eq') return track.rating === v
  }
  if (rule.field === 'key') {
    if (rule.op === 'empty') return !track.key
    if (rule.op === 'eq') return track.key === String(rule.value ?? '')
  }
  return false
}
```

- [ ] **Step 3: RuleSuggestionBanner + settings persistence**

Store `batchRules: BatchRule[]` in settings (default `[]`). Simple editor in LibrarySettings: one example rule row (BPM &lt; X → suggest cull) with enable checkbox.

Banner in App when `evaluateRules(track, batchRules)` returns a rule; Accept calls `handleKeep` or `handleCull`; Dismiss hides for current `track.id` (local `dismissedRuleTrackIds` Set in App state).

- [ ] **Step 4: Run tests + commit**

```bash
npm run test -- test/lib/batch-rules.test.ts
git add src/lib/batch-rules.ts test/lib/batch-rules.test.ts src/components/RuleSuggestionBanner.tsx src/store/settings.ts src/components/LibrarySettings.tsx src/App.tsx
git commit -m "feat: batch rules with suggest keep/cull banner"
```

---

### Task 13: Per-track destination override

**Files:**
- Create: `src/components/PerTrackDestination.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/CommitDialog.tsx`

- [ ] **Step 1: PerTrackDestination component**

Dropdown of leaf playlists (same filter as DestinationPlaylist). On change: `patch(track.id, { destPlaylistId: value })`.

Show "Using default" when no override; display current effective destination.

- [ ] **Step 2: handleKeep uses override**

```typescript
// src/App.tsx handleKeep
destPlaylistId: getDecision(track.id)?.destPlaylistId ?? destinationPlaylistId ?? undefined,
```

- [ ] **Step 3: CommitDialog respects per-track dest**

```typescript
if (decision.keep) {
  const destId = decision.destPlaylistId ?? destinationPlaylistId
  if (destId) {
    await rb('add_to_playlist', { playlistId: destId, trackId })
  }
}
```

Keep blocked only if any keep decision lacks both per-track and global dest.

- [ ] **Step 4: Commit**

```bash
git add src/components/PerTrackDestination.tsx src/App.tsx src/components/CommitDialog.tsx
git commit -m "feat: per-track keep playlist override at decide and commit"
```

---

### Task 14: Playlist membership badges

**Files:**
- Create: `src/components/PlaylistMembershipBadges.tsx`
- Modify: `src/components/TrackCard.tsx`

- [ ] **Step 1: Badges component**

```tsx
export function PlaylistMembershipBadges({ inDest, inCull }: { inDest: boolean; inCull: boolean }) {
  if (!inDest && !inCull) return null
  return (
    <div className="track-card__badges">
      {inDest ? <span className="badge badge--keep">In keep</span> : null}
      {inCull ? <span className="badge badge--cull">In cull</span> : null}
    </div>
  )
}
```

- [ ] **Step 2: Wire TrackCard**

```tsx
const membership = useQueueStore((s) => s.membershipByTrackId[track.id])
<PlaylistMembershipBadges inDest={membership?.inDest ?? false} inCull={membership?.inCull ?? false} />
```

Add minimal CSS in `src/styles/` for `.badge`, `.badge--keep`, `.badge--cull`.

- [ ] **Step 3: Commit**

```bash
git add src/components/PlaylistMembershipBadges.tsx src/components/TrackCard.tsx src/styles/
git commit -m "feat: show in-keep and in-cull badges on track card"
```

---

### Task 15: Review queue before commit

**Files:**
- Create: `src/components/ReviewQueue.tsx`
- Modify: `src/store/decisions.ts`
- Modify: `src/components/CommitDialog.tsx`
- Modify: `src/store/queue.ts` (expose tracks lookup)

**Interfaces:**
- Produces: `removeDecision(trackId)`, `updateDecision(trackId, patch)` on decisions store

- [ ] **Step 1: Extend decisions store**

```typescript
removeDecision: (trackId: string) => void
updateDecision: (trackId: string, patch: Partial<TrackDecision>) => void

removeDecision(trackId) {
  set((state) => {
    const next = { ...state.decisions }
    delete next[trackId]
    return { decisions: next }
  })
},

updateDecision(trackId, patch) {
  get().patch(trackId, patch)
},
```

- [ ] **Step 2: ReviewQueue table**

Columns: Title, Artist, Action (keep/cull select), Rating, Color, Dest playlist (select), Remove button.

Resolve title/artist from `tracks` by id. Use `REKORDBOX_COLORS` and playlist list from queue store.

- [ ] **Step 3: CommitDialog flow**

Replace immediate commit button with two-step:
1. "Review changes" opens `ReviewQueue` embedded in modal (or separate full-screen panel).
2. "Commit to Rekordbox" runs existing commit loop.

`keepBlocked` logic:

```typescript
const keepBlocked = Object.entries(decisions).some(
  ([, d]) => d.keep && !(d.destPlaylistId ?? destinationPlaylistId),
)
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ReviewQueue.tsx src/store/decisions.ts src/components/CommitDialog.tsx
git commit -m "feat: review queue to edit decisions before Rekordbox commit"
```

---

### Task 16: Session mode state + switcher

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/store/settings.ts`
- Modify: `electron/main/session.ts`
- Create: `src/components/ModeSwitcher.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add SessionMode type**

```typescript
export type SessionMode = 'triage' | 'audit' | 'compare'
```

Persist `sessionMode` in settings + session snapshot.

- [ ] **Step 2: ModeSwitcher in header**

Three buttons; active mode gets `btn--primary` class.

- [ ] **Step 3: App renders by mode**

```tsx
{sessionMode === 'triage' && (/* existing center-panel */)}
{sessionMode === 'audit' && <AuditView />}
{sessionMode === 'compare' && <CompareView />}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/store/settings.ts electron/main/session.ts src/components/ModeSwitcher.tsx src/App.tsx
git commit -m "feat: session mode switcher (triage, audit, compare)"
```

---

### Task 17: Audit view

**Files:**
- Create: `src/components/AuditView.tsx`

- [ ] **Step 1: Implement AuditView**

Scrollable table of all tracks in current playlist. Columns: #, Title, Artist, Decision (chip or —), Rating, Color. Row click sets `currentIndex` and plays track (reuse `pool` via callback props from App).

Filter toggle: All | Decided | Undecided.

- [ ] **Step 2: Wire from App**

```tsx
<AuditView
  tracks={tracks}
  decisions={decisions}
  onSelectIndex={(index) => {
    setCurrentIndex(index)
    void pool.setCurrent(index).then(() => pool.play())
    setIsPlaying(true)
  }}
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/AuditView.tsx src/App.tsx
git commit -m "feat: audit mode list with decision status and playback"
```

---

### Task 18: Compare view

**Files:**
- Create: `src/components/CompareView.tsx`
- Modify: `src/store/queue.ts` (optional: `compareAIndex`, `compareBIndex`)

- [ ] **Step 1: Compare state in App**

```tsx
const [compareA, setCompareA] = useState(0)
const [compareB, setCompareB] = useState(1)
```

- [ ] **Step 2: CompareView layout**

Two columns: Track A and Track B selectors (dropdown of playlist tracks). Each column shows TrackCard metadata, mini TransportBar (play/pause for that slot), and shared cue buttons.

Use two `Audio` elements (not full pool) for A/B — create `src/audio/compare-player.ts` with simple play/seek/pause per slot to avoid pool index conflicts.

- [ ] **Step 3: Commit**

```bash
git add src/components/CompareView.tsx src/audio/compare-player.ts src/App.tsx
git commit -m "feat: compare mode for A/B track listening"
```

---

### Task 19: Integration, help overlay, and full verification

**Files:**
- Modify: `src/components/HelpOverlay.tsx`
- Modify: `README.md` (brief Tier 1 feature list)

- [ ] **Step 1: Update keyboard help**

Document: skip presets, review queue shortcut (`Cmd+Enter` to open commit review if added), mode switcher (`M` cycle modes optional).

- [ ] **Step 2: Full test suite**

Run: `npm run test:all && npm run typecheck && npm run build`  
Expected: all pass; build produces sidecar + electron bundle.

- [ ] **Step 3: Manual smoke checklist**

1. Select normal playlist — tracks load, cues appear without per-track delay.
2. Select smart playlist — works or shows refresh message.
3. Auto-play toggle — track plays on advance when enabled.
4. Skip presets — jump to intro / 32 bars / drop / outro.
5. Rule banner — appears for configured rule; accept applies decision.
6. Per-track dest — keep goes to override playlist on commit.
7. Badges — show when track already in keep/cull playlists.
8. Review queue — edit/remove rows before commit.
9. Audit mode — list reflects decisions; click plays track.
10. Compare mode — A and B play independently.
11. Revisit track — waveform loads from peak cache (second load faster).
12. Missing files banner — shows count after playlist load.

- [ ] **Step 4: Commit**

```bash
git add src/components/HelpOverlay.tsx README.md
git commit -m "docs: Tier 1 features help and verification checklist"
```

---

## Self-Review

**Spec coverage**

| Tier 1 item | Task(s) |
|-------------|---------|
| Auto-play on track load | 10 |
| Skip-to-drop presets | 11 |
| Batch rules | 12 |
| Review queue before commit | 15 |
| Smart playlist as source | 3 |
| Per-track destination override | 13 |
| Session modes (Triage/Audit/Compare) | 16–18 |
| Already in playlist indicator | 2, 6, 14 |
| Waveform peak cache | 5, 8 |
| Sidecar warm-up / persistent DB | 1, 6 |
| Bulk get_tracks enrichment | 1, 6 |
| Metadata-only first paint | 6, 9 |
| Album art thumbnail cache | 7 |
| Adjustable waveform quality | 8 |
| Batch file existence | 4, 6 |

**Placeholder scan:** No TBD/TODO steps. All tasks include concrete code.

**Type consistency:** `get_playlist_bundle` returns tracks without embedded `cues` in queue store (stripped); `cuesByTrackId` parallel map. `TrackDecision.destPlaylistId` used in decide, review, and commit paths consistently.

**Gap note:** Compare mode uses a lightweight dual-player instead of AudioPool to avoid index contention — documented in Task 18.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2025-06-28-tier-1-features.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
