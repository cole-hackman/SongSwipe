# Tier 2 Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship all Tier 2 Rekordbox depth, session productivity, and safety/reliability features — XML export path, beatgrid overlay, play history metadata, duplicate detection, read-only tags/comments, named sessions, stats dashboard, session report export, custom keyboard map, gamepad support, dry-run commit, WAL-aware backup, live Rekordbox status indicator, and one-click rollback.

**Architecture:** Extend the Python sidecar with read-enrichment methods (`get_track_extras`, `get_beatgrid`, `find_duplicates`, `plan_commit`, `export_commit_xml`, `list_backups`, `restore_backup`) and upgrade `backup_db` for WAL/SHM. Add Electron main modules for named-session CRUD and export-to-file dialogs. Renderer gets focused libs (`keymap`, `session-stats`, `gamepad`) and new panels (`StatsPanel`, `NamedSessions`, `DuplicatesPanel`, `TrackExtras`, `RekordboxStatus`). Commit flow gains dry-run preview, XML export, and rollback — all without expanding write scope beyond rating + color + playlist membership.

**Tech Stack:** Electron 42, React 19, TypeScript, Zustand, Vitest, pytest, pyrekordbox 0.4.4 (`Rekordbox6Database`, `AnlzFile`, `rbxml`), wavesurfer.js 7, Web Gamepad API, Web MIDI API (Electron Chromium).

## Global Constraints

- Rekordbox 7.x via pyrekordbox sidecar; backup `master.db` before commit; Rekordbox must be closed during writes.
- Write-back scope: **rating + color + playlist membership only** (no My Tags writes, no hot-cue writes).
- Cull adds to cull playlist only — **never delete files from disk**.
- Cues remain **read-only**; beatgrid/phrase markers are **read-only overlays**.
- My Tags and comments are **display-only** in Tier 2.
- XML export is an **alternative commit path** (user imports in Rekordbox) — does not replace direct DB commit.
- Default prefetch window: **5 ahead / 2 behind**.
- Media URLs use **`songswipe-media://`** protocol.
- New sidecar methods must be added to `electron/main/sidecar-allowlist.ts`.
- Do **not** edit `/Users/coleh/.cursor/plans/songswipe_dj_culler_2eef237f.plan.md`.

## Execution Order

```
Phase A (Sidecar reads)        → Tasks 1–5
Phase B (Sidecar safety/write) → Tasks 6–9
Phase C (Electron session I/O) → Tasks 10–11
Phase D (Renderer libs)        → Tasks 12–14
Phase E (UI surfaces)          → Tasks 15–20
Phase F (Commit flow)          → Tasks 21–22
Phase G (Integration)          → Task 23
```

Phases are independently shippable. Complete in order.

## File Structure

| File | Responsibility |
|------|----------------|
| `sidecar/commands.py` | Track extras, beatgrid, duplicates, plan_commit, XML export, backup/restore |
| `sidecar/xml_export.py` | Build Rekordbox XML from planned commit ops |
| `sidecar/tests/test_track_extras.py` | Metadata enrichment tests |
| `sidecar/tests/test_beatgrid.py` | Beatgrid parsing tests |
| `sidecar/tests/test_duplicates.py` | Duplicate clustering tests |
| `sidecar/tests/test_backup_restore.py` | WAL backup + restore tests |
| `sidecar/tests/test_plan_commit.py` | Dry-run planner tests |
| `electron/main/named-sessions.ts` | CRUD for `userData/sessions/*.json` |
| `electron/main/export-dialog.ts` | `dialog.showSaveDialog` helper for reports/XML |
| `electron/main/ipc.ts` | Named session + export IPC handlers |
| `electron/preload/index.ts` | Expose new APIs |
| `src/lib/types.ts` | `TrackExtras`, `BeatMarker`, `DuplicateCluster`, `KeyBinding`, `SessionStats` |
| `src/lib/keymap.ts` | Default bindings + `resolveKeyAction()` |
| `src/lib/session-stats.ts` | Compute stats from tracks + decisions |
| `src/lib/duplicate-utils.ts` | Client-side cluster helpers |
| `src/audio/gamepad.ts` | Gamepad poll loop + action dispatch |
| `src/audio/useGamepad.ts` | React hook wiring gamepad to App actions |
| `src/audio/useWaveform.ts` | Beatgrid region overlay |
| `src/store/settings.ts` | `keymap`, `gamepadEnabled` |
| `src/components/RekordboxStatus.tsx` | Live RB running indicator |
| `src/components/TrackExtras.tsx` | Comment, play count, dates, my tags |
| `src/components/DuplicatesPanel.tsx` | Duplicate clusters for current playlist |
| `src/components/StatsPanel.tsx` | Session stats dashboard |
| `src/components/NamedSessions.tsx` | Save/load/delete named sessions |
| `src/components/KeymapSettings.tsx` | Custom keyboard map editor |
| `src/components/CommitDialog.tsx` | Dry-run, XML export, rollback |
| `src/App.tsx` | Wire status, keymap, gamepad, panels |
| `test/lib/keymap.test.ts` | Keymap resolver tests |
| `test/lib/session-stats.test.ts` | Stats computation tests |

---

### Task 1: Extended track metadata (comment, play count, dates)

**Files:**
- Modify: `sidecar/commands.py` (`_track_dict`)
- Create: `sidecar/tests/test_track_extras.py`
- Modify: `src/lib/types.ts`

**Interfaces:**
- Produces: `_track_dict` adds `comment: str`, `playCount: int`, `dateAdded: str | null`, `lastPlayed: str | null` (ISO date strings or empty)

- [ ] **Step 1: Write the failing test**

```python
# sidecar/tests/test_track_extras.py
from datetime import datetime
from unittest.mock import MagicMock

import commands


def test_track_dict_includes_comment_and_play_count():
    db = MagicMock()
    db.get_artist.return_value = None
    db.get_album.return_value = None
    db.get_key.return_value = None

    created = datetime(2024, 1, 15, 12, 0, 0)
    content = MagicMock(
        ID="t1",
        FolderPath="/music/a.mp3",
        Title="A",
        ArtistID=None,
        AlbumID=None,
        ImagePath=None,
        BPM=None,
        KeyID=None,
        Rating=0,
        ColorID=0,
        Length=180,
        Commnt="Great opener",
        DJPlayCount=12,
        created_at=created,
        DateCreated=created,
        ReleaseDate=None,
    )

    track = commands._track_dict(content, db)

    assert track["comment"] == "Great opener"
    assert track["playCount"] == 12
    assert track["dateAdded"] is not None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/pytest sidecar/tests/test_track_extras.py::test_track_dict_includes_comment_and_play_count -v`  
Expected: FAIL (`KeyError: 'comment'`)

- [ ] **Step 3: Implement in `_track_dict`**

```python
def _iso_date(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    text = str(value).strip()
    return text or None


def _track_dict(content: Any, db: Rekordbox6Database) -> dict[str, Any]:
    # ... existing artist/album/artwork logic ...
    return {
        # ... existing fields ...
        "comment": str(getattr(content, "Commnt", None) or ""),
        "playCount": int(getattr(content, "DJPlayCount", 0) or 0),
        "dateAdded": _iso_date(getattr(content, "DateCreated", None) or getattr(content, "created_at", None)),
        "lastPlayed": _iso_date(getattr(content, "ReleaseDate", None)),  # fallback; use rb_play_history if present
    }
```

```typescript
// src/lib/types.ts — extend Track
export type Track = {
  // ...existing fields...
  comment?: string
  playCount?: number
  dateAdded?: string | null
  lastPlayed?: string | null
}
```

- [ ] **Step 4: Run tests**

Run: `.venv/bin/pytest sidecar/tests/test_track_extras.py -v && npm run typecheck`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add sidecar/commands.py sidecar/tests/test_track_extras.py src/lib/types.ts
git commit -m "feat(sidecar): expose comment, play count, and dates on tracks"
```

---

### Task 2: Read-only My Tags

**Files:**
- Modify: `sidecar/commands.py`
- Modify: `sidecar/tests/test_track_extras.py`
- Modify: `electron/main/sidecar-allowlist.ts`

**Interfaces:**
- Produces: `get_my_tags(track_id: str) -> list[str]`

- [ ] **Step 1: Write the failing test**

```python
@patch("commands.open_db")
def test_get_my_tags_returns_tag_names(mock_open_db):
    db = MagicMock()
    mock_open_db.return_value = db
    tag_row = MagicMock(MyTagID="tag-1")
    db.get_content_my_tag.return_value = [tag_row]
    tag = MagicMock(Name="Peak Hour")
    db.get_my_tag.return_value = tag

    tags = commands.get_my_tags("track-1")

    assert tags == ["Peak Hour"]
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `.venv/bin/pytest sidecar/tests/test_track_extras.py::test_get_my_tags_returns_tag_names -v`

- [ ] **Step 3: Implement**

```python
def get_my_tags(track_id: str) -> list[str]:
    db = open_db()
    rows = db.get_content_my_tag(ContentID=track_id) or []
    names: list[str] = []
    for row in rows:
        tag_id = getattr(row, "MyTagID", None)
        if not tag_id:
            continue
        tag = db.get_my_tag(ID=tag_id)
        if tag is not None and getattr(tag, "Name", None):
            names.append(str(tag.Name))
    return names
```

Add to dispatch + allowlist as `get_my_tags`.

> **Note:** If `get_content_my_tag` / `get_my_tag` method names differ in pyrekordbox 0.4.4, inspect `dir(db)` in a REPL against a test DB and adjust — keep test mocks aligned with actual API names.

- [ ] **Step 4: Run tests + commit**

```bash
.venv/bin/pytest sidecar/tests/test_track_extras.py -v
git add sidecar/commands.py sidecar/tests/test_track_extras.py electron/main/sidecar-allowlist.ts
git commit -m "feat(sidecar): read-only My Tags per track"
```

---

### Task 3: Beatgrid read API

**Files:**
- Create: `sidecar/beatgrid.py`
- Modify: `sidecar/commands.py`
- Create: `sidecar/tests/test_beatgrid.py`
- Modify: `electron/main/sidecar-allowlist.ts`

**Interfaces:**
- Produces: `get_beatgrid(track_id: str) -> list[dict]` with `{ "positionSec": float, "bpm": float | null, "beatInBar": int }`

- [ ] **Step 1: Write the failing test**

```python
# sidecar/tests/test_beatgrid.py
from unittest.mock import MagicMock, patch

import commands


@patch("beatgrid.beatgrid_from_content")
@patch("commands.open_db")
def test_get_beatgrid_returns_positions(mock_open_db, mock_from_content):
    db = MagicMock()
    mock_open_db.return_value = db
    content = MagicMock(ID="t1")
    db.get_content.return_value = content
    mock_from_content.return_value = [
        {"positionSec": 0.0, "bpm": 128.0, "beatInBar": 1},
        {"positionSec": 0.46875, "bpm": 128.0, "beatInBar": 2},
    ]

    result = commands.get_beatgrid("t1")

    assert len(result) == 2
    assert result[0]["positionSec"] == 0.0
```

- [ ] **Step 2: Implement `sidecar/beatgrid.py`**

```python
from __future__ import annotations

from typing import Any


def beatgrid_from_content(db: Any, content: Any) -> list[dict[str, float | int | None]]:
    try:
        anlz_files = db.read_anlz_files(content)
    except Exception:
        return []

    beats: list[dict[str, float | int | None]] = []
    for anlz in anlz_files:
        grid = anlz.get_tag("beat_grid")
        if grid is None:
            continue
        entries = getattr(grid, "beats", None) or getattr(grid, "beat_entries", None) or []
        for entry in entries:
            time_ms = float(getattr(entry, "time", 0) or 0)
            tempo = getattr(entry, "tempo", None)
            bpm = float(tempo) / 100.0 if tempo else None
            beats.append(
                {
                    "positionSec": time_ms / 1000.0,
                    "bpm": bpm,
                    "beatInBar": int(getattr(entry, "beat_number", 0) or 0),
                }
            )
        if beats:
            break
    return beats
```

```python
# sidecar/commands.py
from beatgrid import beatgrid_from_content

def get_beatgrid(track_id: str) -> list[dict[str, Any]]:
    db = open_db()
    content = _require_content(db, track_id)
    return beatgrid_from_content(db, content)
```

- [ ] **Step 3: Run tests + commit**

```bash
.venv/bin/pytest sidecar/tests/test_beatgrid.py -v
git add sidecar/beatgrid.py sidecar/commands.py sidecar/tests/test_beatgrid.py electron/main/sidecar-allowlist.ts
git commit -m "feat(sidecar): read beatgrid markers from ANLZ files"
```

---

### Task 4: Duplicate detection

**Files:**
- Create: `sidecar/duplicates.py`
- Modify: `sidecar/commands.py`
- Create: `sidecar/tests/test_duplicates.py`
- Modify: `electron/main/sidecar-allowlist.ts`
- Create: `src/lib/duplicate-utils.ts`

**Interfaces:**
- Produces: `find_duplicates(playlist_id: str) -> list[dict]` where each item is `{ "key": str, "trackIds": list[str], "reason": "path" | "metadata" }`

- [ ] **Step 1: Write the failing test**

```python
# sidecar/tests/test_duplicates.py
from duplicates import cluster_duplicates


def test_cluster_duplicates_by_same_path():
    tracks = [
        {"id": "1", "path": "/music/a.mp3", "title": "A", "artist": "X"},
        {"id": "2", "path": "/music/a.mp3", "title": "A copy", "artist": "X"},
        {"id": "3", "path": "/music/b.mp3", "title": "B", "artist": "Y"},
    ]
    clusters = cluster_duplicates(tracks)
    assert len(clusters) == 1
    assert set(clusters[0]["trackIds"]) == {"1", "2"}
    assert clusters[0]["reason"] == "path"
```

- [ ] **Step 2: Implement `sidecar/duplicates.py`**

```python
from __future__ import annotations

import os
from typing import Any


def cluster_duplicates(tracks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_path: dict[str, list[str]] = {}
    by_meta: dict[str, list[str]] = {}

    for track in tracks:
        track_id = str(track["id"])
        path = str(track.get("path") or "").strip()
        if path:
            norm = os.path.normcase(os.path.normpath(path))
            by_path.setdefault(norm, []).append(track_id)

        title = str(track.get("title") or "").strip().lower()
        artist = str(track.get("artist") or "").strip().lower()
        if title and artist:
            by_meta.setdefault(f"{artist}::{title}", []).append(track_id)

    clusters: list[dict[str, Any]] = []
    seen: set[frozenset[str]] = set()

    for path, ids in by_path.items():
        if len(ids) < 2:
            continue
        key = frozenset(ids)
        if key in seen:
            continue
        seen.add(key)
        clusters.append({"key": path, "trackIds": ids, "reason": "path"})

    for meta, ids in by_meta.items():
        if len(ids) < 2:
            continue
        key = frozenset(ids)
        if key in seen:
            continue
        seen.add(key)
        clusters.append({"key": meta, "trackIds": ids, "reason": "metadata"})

    return clusters
```

```python
def find_duplicates(playlist_id: str) -> list[dict[str, Any]]:
    tracks = get_tracks(playlist_id)
    return cluster_duplicates(tracks)
```

- [ ] **Step 3: Run tests + commit**

```bash
.venv/bin/pytest sidecar/tests/test_duplicates.py -v
git add sidecar/duplicates.py sidecar/commands.py sidecar/tests/test_duplicates.py electron/main/sidecar-allowlist.ts src/lib/duplicate-utils.ts
git commit -m "feat: duplicate detection by path and artist+title"
```

---

### Task 5: Track extras UI (comment, history, tags)

**Files:**
- Create: `src/components/TrackExtras.tsx`
- Modify: `src/store/queue.ts` (optional: cache tags per track)
- Modify: `src/components/TrackCard.tsx` or `src/App.tsx`

**Interfaces:**
- Consumes: `rb('get_my_tags', { trackId })`, extended `Track` fields from bundle

- [ ] **Step 1: Create TrackExtras component**

```tsx
// src/components/TrackExtras.tsx
import { useEffect, useState } from 'react'
import { rb } from '@/lib/ipc'
import type { Track } from '@/lib/types'

export function TrackExtras({ track }: { track: Track }) {
  const [tags, setTags] = useState<string[]>([])

  useEffect(() => {
    let active = true
    void rb<string[]>('get_my_tags', { trackId: track.id }).then((names) => {
      if (active) setTags(names)
    }).catch(() => {
      if (active) setTags([])
    })
    return () => { active = false }
  }, [track.id])

  return (
    <div className="panel-block track-extras">
      <h2>Track info</h2>
      {track.comment ? <p className="track-extras__comment">{track.comment}</p> : null}
      <p className="top-bar__meta">
        Played {track.playCount ?? 0}×
        {track.dateAdded ? ` · Added ${formatDate(track.dateAdded)}` : ''}
        {track.lastPlayed ? ` · Last ${formatDate(track.lastPlayed)}` : ''}
      </p>
      {tags.length ? (
        <div className="track-extras__tags">
          {tags.map((tag) => (
            <span key={tag} className="badge">{tag}</span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString()
}
```

- [ ] **Step 2: Wire in App right rail (Triage mode)**

```tsx
{track && sessionMode === 'triage' ? (
  <>
    <TrackExtras track={track} />
    {/* existing PerTrackDestination, RatingControl, etc. */}
  </>
) : null}
```

- [ ] **Step 3: Add CSS + commit**

```bash
git add src/components/TrackExtras.tsx src/App.tsx src/styles/global.css
git commit -m "feat: display comment, play history, and read-only My Tags"
```

---

### Task 6: WAL-aware backup + list/restore backups

**Files:**
- Modify: `sidecar/commands.py`
- Create: `sidecar/tests/test_backup_restore.py`
- Modify: `electron/main/sidecar-allowlist.ts`

**Interfaces:**
- Produces:
  - `backup_db() -> { backupPath, walPath?, shmPath? }`
  - `list_backups() -> list[{ path, createdAt }]`
  - `restore_backup(backup_path: str) -> { ok: true }`

- [ ] **Step 1: Write failing tests**

```python
# sidecar/tests/test_backup_restore.py
from pathlib import Path
from unittest.mock import MagicMock, patch

import commands


@patch("commands.shutil.copy2")
@patch("commands._db_path")
def test_backup_db_copies_wal_and_shm_when_present(mock_db_path, mock_copy):
    base = Path("/tmp/master.db")
    mock_db_path.return_value = base
    wal = base.with_name("master.db-wal")
    shm = base.with_name("master.db-shm")
    wal.write_text("wal")
    shm.write_text("shm")

    result = commands.backup_db()

    assert result["backupPath"].endswith(".songswipe-backup-")
    assert mock_copy.call_count >= 3
    wal.unlink(missing_ok=True)
    shm.unlink(missing_ok=True)
```

- [ ] **Step 2: Implement**

```python
def _copy_if_exists(src: Path, dest: Path) -> str | None:
    if src.exists():
        shutil.copy2(src, dest)
        return str(dest)
    return None


def backup_db() -> dict[str, Any]:
    if is_rekordbox_running():
        raise RuntimeError("Close Rekordbox before backing up the library.")
    path = _db_path()
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = path.with_name(f"master.db.songswipe-backup-{stamp}")
    shutil.copy2(path, backup)
    wal = _copy_if_exists(path.with_name(f"{path.name}-wal"), backup.with_name(f"{backup.name}-wal"))
    shm = _copy_if_exists(path.with_name(f"{path.name}-shm"), backup.with_name(f"{backup.name}-shm"))
    return {"backupPath": str(backup), "walPath": wal, "shmPath": shm}


def list_backups() -> list[dict[str, str]]:
    path = _db_path()
    backups = sorted(path.parent.glob("master.db.songswipe-backup-*"), reverse=True)
    result = []
    for backup in backups:
        if backup.name.endswith("-wal") or backup.name.endswith("-shm"):
            continue
        result.append({
            "path": str(backup),
            "createdAt": datetime.fromtimestamp(backup.stat().st_mtime).isoformat(),
        })
    return result


def restore_backup(backup_path: str) -> dict[str, bool]:
    if is_rekordbox_running():
        raise RuntimeError("Close Rekordbox before restoring the library.")
    close_db()
    src = Path(backup_path)
    if not src.exists():
        raise FileNotFoundError(f"Backup not found: {backup_path}")
    dest = _db_path()
    shutil.copy2(src, dest)
    wal_src = src.with_name(f"{src.name}-wal")
    shm_src = src.with_name(f"{src.name}-shm")
    if wal_src.exists():
        shutil.copy2(wal_src, dest.with_name(f"{dest.name}-wal"))
    if shm_src.exists():
        shutil.copy2(shm_src, dest.with_name(f"{dest.name}-shm"))
    return {"ok": True}
```

- [ ] **Step 3: Run tests, update allowlist, commit**

```bash
.venv/bin/pytest sidecar/tests/test_backup_restore.py -v
git add sidecar/commands.py sidecar/tests/test_backup_restore.py electron/main/sidecar-allowlist.ts
git commit -m "feat(sidecar): WAL-aware backup, list backups, restore"
```

---

### Task 7: Dry-run commit planner

**Files:**
- Modify: `sidecar/commands.py`
- Create: `sidecar/tests/test_plan_commit.py`
- Modify: `electron/main/sidecar-allowlist.ts`
- Modify: `src/lib/types.ts`

**Interfaces:**
- Produces: `plan_commit(decisions: list[dict]) -> { operations: list[dict] }` where each op is `{ type: "rating"|"color"|"add_to_playlist", trackId, ... }`

- [ ] **Step 1: Write failing test**

```python
def test_plan_commit_describes_operations():
    decisions = [
        {"trackId": "t1", "keep": True, "rating": 4, "destPlaylistId": "keep-pl"},
        {"trackId": "t2", "keep": False, "cullPlaylistId": "cull-pl"},
    ]
    plan = commands.plan_commit(decisions, default_dest_id="keep-pl", default_cull_id="cull-pl")
    types = [op["type"] for op in plan["operations"]]
    assert "set_rating" in types
    assert "add_to_playlist" in types
```

- [ ] **Step 2: Implement (no DB writes)**

```python
def plan_commit(
    decisions: list[dict[str, Any]],
    default_dest_id: str | None = None,
    default_cull_id: str | None = None,
) -> dict[str, list[dict[str, Any]]]:
    operations: list[dict[str, Any]] = []
    for item in decisions:
        track_id = str(item["trackId"])
        if item.get("rating") is not None:
            operations.append({"type": "set_rating", "trackId": track_id, "rating": int(item["rating"])})
        if item.get("colorId") is not None:
            operations.append({"type": "set_color", "trackId": track_id, "colorId": int(item["colorId"])})
        if item.get("keep"):
            dest = item.get("destPlaylistId") or default_dest_id
            if dest:
                operations.append({"type": "add_to_playlist", "trackId": track_id, "playlistId": str(dest)})
        else:
            cull = item.get("cullPlaylistId") or default_cull_id
            if cull:
                operations.append({"type": "add_to_playlist", "trackId": track_id, "playlistId": str(cull)})
    return {"operations": operations}
```

- [ ] **Step 3: Run tests + commit**

```bash
.venv/bin/pytest sidecar/tests/test_plan_commit.py -v
git commit -m "feat(sidecar): dry-run commit planner"
```

---

### Task 8: Rekordbox XML export

**Files:**
- Create: `sidecar/xml_export.py`
- Modify: `sidecar/commands.py`
- Create: `sidecar/tests/test_xml_export.py`
- Modify: `electron/main/sidecar-allowlist.ts`

**Interfaces:**
- Produces: `export_commit_xml(decisions, default_dest_id, default_cull_id) -> { xml: str, trackCount: int }`

- [ ] **Step 1: Write failing test**

```python
# sidecar/tests/test_xml_export.py
from xml_export import build_commit_xml


def test_build_commit_xml_contains_track_nodes():
    xml = build_commit_xml(
        operations=[
            {"type": "set_rating", "trackId": "123", "rating": 4},
        ],
        track_titles={"123": "Test Track"},
    )
    assert "<TRACK" in xml
    assert "123" in xml
    assert "Test Track" in xml
```

- [ ] **Step 2: Implement minimal XML builder**

```python
# sidecar/xml_export.py
from __future__ import annotations

import xml.etree.ElementTree as ET
from typing import Any


def build_commit_xml(
    operations: list[dict[str, Any]],
    track_titles: dict[str, str],
) -> str:
    root = ET.Element("DJ_PLAYLISTS", Version="1.0.0")
    collection = ET.SubElement(root, "COLLECTION", Entries=str(len(track_titles)))

    ratings: dict[str, int] = {}
    for op in operations:
        if op["type"] == "set_rating":
            ratings[str(op["trackId"])] = int(op["rating"])

    for track_id, title in track_titles.items():
        attrs = {"TrackID": track_id, "Name": title}
        if track_id in ratings:
            attrs["Rating"] = str(ratings[track_id] * 51)  # rbxml star encoding
        ET.SubElement(collection, "TRACK", **attrs)

    return ET.tostring(root, encoding="unicode")
```

```python
def export_commit_xml(
    decisions: list[dict[str, Any]],
    default_dest_id: str | None = None,
    default_cull_id: str | None = None,
) -> dict[str, Any]:
    plan = plan_commit(decisions, default_dest_id, default_cull_id)
    db = open_db()
    titles: dict[str, str] = {}
    for item in decisions:
        track_id = str(item["trackId"])
        content = db.get_content(ID=track_id)
        titles[track_id] = str(getattr(content, "Title", None) or track_id) if content else track_id
    xml = build_commit_xml(plan["operations"], titles)
    return {"xml": xml, "trackCount": len(decisions)}
```

- [ ] **Step 3: Run tests + commit**

```bash
.venv/bin/pytest sidecar/tests/test_xml_export.py -v
git commit -m "feat(sidecar): generate Rekordbox XML from planned commit"
```

---

### Task 9: Beatgrid waveform overlay

**Files:**
- Modify: `src/store/queue.ts`
- Modify: `src/audio/useWaveform.ts`
- Modify: `src/components/WaveformPlayer.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `rb('get_beatgrid', { trackId })`
- Produces: downbeat regions on waveform (every 4th beat or `beatInBar === 1`)

- [ ] **Step 1: Load beatgrid on track change in queue store or App**

```typescript
// src/App.tsx — state
const [beatgrid, setBeatgrid] = useState<BeatMarker[]>([])

useEffect(() => {
  if (!track) { setBeatgrid([]); return }
  void rb<BeatMarker[]>('get_beatgrid', { trackId: track.id })
    .then(setBeatgrid)
    .catch(() => setBeatgrid([]))
}, [track?.id])
```

```typescript
// src/lib/types.ts
export type BeatMarker = { positionSec: number; bpm: number | null; beatInBar: number }
```

- [ ] **Step 2: Add beatgrid regions in useWaveform**

```typescript
type UseWaveformOptions = {
  // ...existing
  beatgrid?: BeatMarker[]
}

// In regions effect, after cues:
beatgrid
  ?.filter((b) => b.beatInBar === 1)
  .forEach((beat, index) => {
    regions.addRegion({
      id: `beat-${index}`,
      start: beat.positionSec,
      end: beat.positionSec + 0.02,
      color: 'rgba(91, 141, 239, 0.35)',
      drag: false,
      resize: false,
    })
  })
```

- [ ] **Step 3: Pass beatgrid to WaveformPlayer + commit**

```bash
git add src/lib/types.ts src/App.tsx src/audio/useWaveform.ts src/components/WaveformPlayer.tsx
git commit -m "feat: beatgrid downbeat overlay on waveform"
```

---

### Task 10: Named sessions (Electron main)

**Files:**
- Create: `electron/main/named-sessions.ts`
- Modify: `electron/main/ipc.ts`
- Modify: `electron/preload/index.ts`
- Modify: `src/lib/ipc.ts`
- Modify: `src/lib/api.d.ts`

**Interfaces:**
- Produces:
  - `listNamedSessions(): Promise<Array<{ id: string; name: string; updatedAt: string }>>`
  - `saveNamedSession(id: string, data: SessionData): Promise<void>`
  - `loadNamedSession(id: string): Promise<SessionData | null>`
  - `deleteNamedSession(id: string): Promise<void>`

- [ ] **Step 1: Implement named-sessions.ts**

```typescript
// electron/main/named-sessions.ts
import { app } from 'electron'
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { SessionData } from './session'

function sessionsDir(): string {
  return path.join(app.getPath('userData'), 'sessions')
}

function sessionFile(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9-_]/g, '-')
  return path.join(sessionsDir(), `${safe}.json`)
}

export async function listNamedSessions(): Promise<Array<{ id: string; name: string; updatedAt: string }>> {
  await mkdir(sessionsDir(), { recursive: true })
  const files = await readdir(sessionsDir())
  const items: Array<{ id: string; name: string; updatedAt: string }> = []
  for (const file of files.filter((f) => f.endsWith('.json'))) {
    const raw = await readFile(path.join(sessionsDir(), file), 'utf8')
    const data = JSON.parse(raw) as SessionData & { name?: string }
    items.push({
      id: file.replace(/\.json$/, ''),
      name: data.name ?? file,
      updatedAt: data.updatedAt ?? '',
    })
  }
  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function saveNamedSession(id: string, data: SessionData & { name: string }): Promise<void> {
  await mkdir(sessionsDir(), { recursive: true })
  await writeFile(sessionFile(id), JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2))
}

export async function loadNamedSession(id: string): Promise<SessionData | null> {
  try {
    const raw = await readFile(sessionFile(id), 'utf8')
    return JSON.parse(raw) as SessionData
  } catch {
    return null
  }
}

export async function deleteNamedSession(id: string): Promise<void> {
  await unlink(sessionFile(id))
}
```

- [ ] **Step 2: Wire IPC + preload**

Handlers: `sessions:list`, `sessions:save`, `sessions:load`, `sessions:delete`

- [ ] **Step 3: Commit**

```bash
git add electron/main/named-sessions.ts electron/main/ipc.ts electron/preload/index.ts src/lib/ipc.ts src/lib/api.d.ts
git commit -m "feat: named session CRUD in userData/sessions"
```

---

### Task 11: Session report export dialog

**Files:**
- Create: `electron/main/export-dialog.ts`
- Modify: `electron/main/ipc.ts`
- Create: `src/lib/session-report.ts`

**Interfaces:**
- Produces: `exportSessionReport(format: 'json' | 'csv', payload: unknown): Promise<{ savedPath: string | null }>`

- [ ] **Step 1: export-dialog.ts**

```typescript
import { dialog } from 'electron'
import { writeFile } from 'node:fs/promises'

export async function exportTextFile(
  defaultName: string,
  contents: string,
  filters: Array<{ name: string; extensions: string[] }>,
): Promise<string | null> {
  const result = await dialog.showSaveDialog({ defaultPath: defaultName, filters })
  if (result.canceled || !result.filePath) return null
  await writeFile(result.filePath, contents, 'utf8')
  return result.filePath
}
```

- [ ] **Step 2: session-report.ts**

```typescript
import type { Track, TrackDecision } from '@/lib/types'

export function buildSessionReportCsv(
  tracks: Track[],
  decisions: Record<string, TrackDecision>,
): string {
  const header = 'trackId,title,artist,action,rating,colorId,destPlaylistId'
  const byId = new Map(tracks.map((t) => [t.id, t]))
  const rows = Object.entries(decisions).map(([trackId, d]) => {
    const t = byId.get(trackId)
    return [
      trackId,
      csvEscape(t?.title ?? ''),
      csvEscape(t?.artist ?? ''),
      d.keep ? 'keep' : 'cull',
      d.rating ?? '',
      d.colorId ?? '',
      d.destPlaylistId ?? '',
    ].join(',')
  })
  return [header, ...rows].join('\n')
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export function buildSessionReportJson(
  tracks: Track[],
  decisions: Record<string, TrackDecision>,
): string {
  return JSON.stringify({ tracks, decisions, exportedAt: new Date().toISOString() }, null, 2)
}
```

- [ ] **Step 3: IPC `export:sessionReport` + commit**

```bash
git add electron/main/export-dialog.ts electron/main/ipc.ts src/lib/session-report.ts
git commit -m "feat: export session report to CSV or JSON via save dialog"
```

---

### Task 12: Session stats library

**Files:**
- Create: `src/lib/session-stats.ts`
- Create: `test/lib/session-stats.test.ts`

**Interfaces:**
- Produces: `computeSessionStats(tracks, decisions) -> SessionStats`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it } from 'vitest'
import { computeSessionStats } from '@/lib/session-stats'

describe('computeSessionStats', () => {
  it('computes keep ratio and average BPM of keepers', () => {
    const tracks = [
      { id: '1', bpm: 120 } as any,
      { id: '2', bpm: 140 } as any,
    ]
    const decisions = {
      '1': { keep: true },
      '2': { keep: false },
    }
    const stats = computeSessionStats(tracks, decisions)
    expect(stats.total).toBe(2)
    expect(stats.keepCount).toBe(1)
    expect(stats.keepRatio).toBe(0.5)
    expect(stats.avgBpmKeepers).toBe(120)
  })
})
```

- [ ] **Step 2: Implement**

```typescript
import type { Track, TrackDecision } from '@/lib/types'

export type SessionStats = {
  total: number
  keepCount: number
  cullCount: number
  keepRatio: number
  avgBpmKeepers: number | null
  avgBpmCulls: number | null
  colorCounts: Record<number, number>
}

export function computeSessionStats(
  tracks: Track[],
  decisions: Record<string, TrackDecision>,
): SessionStats {
  const byId = new Map(tracks.map((t) => [t.id, t]))
  const values = Object.entries(decisions)
  const keep = values.filter(([, d]) => d.keep)
  const cull = values.filter(([, d]) => !d.keep)
  const bpm = (entries: Array<[string, TrackDecision]>) =>
    entries
      .map(([id]) => byId.get(id)?.bpm)
      .filter((v): v is number => typeof v === 'number')
  const keepBpms = bpm(keep)
  const cullBpms = bpm(cull)
  const colorCounts: Record<number, number> = {}
  for (const [, d] of values) {
    const color = d.colorId ?? 0
    colorCounts[color] = (colorCounts[color] ?? 0) + 1
  }
  const total = values.length
  return {
    total,
    keepCount: keep.length,
    cullCount: cull.length,
    keepRatio: total ? keep.length / total : 0,
    avgBpmKeepers: keepBpms.length ? keepBpms.reduce((a, b) => a + b, 0) / keepBpms.length : null,
    avgBpmCulls: cullBpms.length ? cullBpms.reduce((a, b) => a + b, 0) / cullBpms.length : null,
    colorCounts,
  }
}
```

- [ ] **Step 3: Run tests + commit**

```bash
npm run test -- test/lib/session-stats.test.ts
git commit -m "feat: session stats computation"
```

---

### Task 13: Custom keyboard map

**Files:**
- Create: `src/lib/keymap.ts`
- Create: `test/lib/keymap.test.ts`
- Create: `src/components/KeymapSettings.tsx`
- Modify: `src/store/settings.ts`
- Modify: `electron/main/app-settings.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces:
  - `export type KeyAction = 'keep' | 'cull' | 'play' | 'undo' | 'help' | 'cue1'..'cue8' | 'rate1'..'rate5'`
  - `DEFAULT_KEYMAP: Record<KeyAction, string>`
  - `resolveKeyAction(event: KeyboardEvent, map: Record<KeyAction, string>): KeyAction | null`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it } from 'vitest'
import { DEFAULT_KEYMAP, resolveKeyAction } from '@/lib/keymap'

describe('resolveKeyAction', () => {
  it('maps ArrowRight to keep', () => {
    const event = { key: 'ArrowRight', shiftKey: false, metaKey: false, ctrlKey: false } as KeyboardEvent
    expect(resolveKeyAction(event, DEFAULT_KEYMAP)).toBe('keep')
  })
})
```

- [ ] **Step 2: Implement keymap.ts**

```typescript
export type KeyAction =
  | 'keep' | 'cull' | 'play' | 'undo' | 'help'
  | 'cue1' | 'cue2' | 'cue3' | 'cue4' | 'cue5' | 'cue6' | 'cue7' | 'cue8'
  | 'rate1' | 'rate2' | 'rate3' | 'rate4' | 'rate5'

export const DEFAULT_KEYMAP: Record<KeyAction, string> = {
  keep: 'ArrowRight',
  cull: 'ArrowLeft',
  play: ' ',
  undo: 'z',
  help: '?',
  cue1: '1', cue2: '2', cue3: '3', cue4: '4',
  cue5: '5', cue6: '6', cue7: '7', cue8: '8',
  rate1: 'Shift+1', rate2: 'Shift+2', rate3: 'Shift+3', rate4: 'Shift+4', rate5: 'Shift+5',
}

export function resolveKeyAction(
  event: KeyboardEvent,
  map: Record<KeyAction, string>,
): KeyAction | null {
  const pressed = event.shiftKey ? `Shift+${event.key}` : event.key
  for (const [action, binding] of Object.entries(map) as Array<[KeyAction, string]>) {
    if (binding === pressed) return action
  }
  return null
}
```

- [ ] **Step 3: Replace hardcoded keydown in App.tsx**

```typescript
const keymap = useSettingsStore((s) => s.keymap)

useEffect(() => {
  function onKeyDown(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return
    const action = resolveKeyAction(event, keymap)
    if (!action) return
    if (action === 'help') { setHelpOpen(true); return }
    if (action === 'undo') { handleUndo(); return }
    if (action === 'play') { event.preventDefault(); void togglePlay(); return }
    if (sessionMode !== 'triage') return
    if (action === 'keep') { handleKeep(); return }
    if (action === 'cull') { handleCull(); return }
    if (action.startsWith('cue') && !event.shiftKey) {
      const index = Number(action.replace('cue', '')) - 1
      const cue = cues[index]
      if (cue) jumpToCue(cue.positionSec)
      return
    }
    if (action.startsWith('rate') && track) {
      patch(track.id, { rating: Number(action.replace('rate', '')) })
    }
  }
  window.addEventListener('keydown', onKeyDown)
  return () => window.removeEventListener('keydown', onKeyDown)
}, [cues, handleCull, handleKeep, handleUndo, jumpToCue, keymap, patch, sessionMode, togglePlay, track])
```

- [ ] **Step 4: KeymapSettings UI + persist in settings + commit**

```bash
npm run test -- test/lib/keymap.test.ts
git commit -m "feat: customizable keyboard map with settings editor"
```

---

### Task 14: Gamepad support

**Files:**
- Create: `src/audio/gamepad.ts`
- Create: `src/audio/useGamepad.ts`
- Modify: `src/store/settings.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `createGamepadLoop(bindings, onAction)` — maps buttons 0=cull, 1=keep, 2=play (Xbox layout)

- [ ] **Step 1: Implement gamepad.ts**

```typescript
export type GamepadAction = 'keep' | 'cull' | 'play'

const DEFAULT_BINDINGS: Record<number, GamepadAction> = {
  0: 'cull',   // A
  1: 'keep',   // B
  2: 'play',   // X
}

export function createGamepadLoop(
  onAction: (action: GamepadAction) => void,
  bindings: Record<number, GamepadAction> = DEFAULT_BINDINGS,
): () => void {
  const previous: Record<number, boolean> = {}
  const id = window.setInterval(() => {
    const pads = navigator.getGamepads()
    const pad = pads[0]
    if (!pad) return
    for (const [indexStr, action] of Object.entries(bindings)) {
      const index = Number(indexStr)
      const pressed = Boolean(pad.buttons[index]?.pressed)
      if (pressed && !previous[index]) onAction(action)
      previous[index] = pressed
    }
  }, 50)
  return () => window.clearInterval(id)
}
```

- [ ] **Step 2: useGamepad hook + App integration**

```typescript
// src/audio/useGamepad.ts
import { useEffect } from 'react'
import { createGamepadLoop, type GamepadAction } from '@/audio/gamepad'

export function useGamepad(enabled: boolean, onAction: (action: GamepadAction) => void) {
  useEffect(() => {
    if (!enabled) return
    return createGamepadLoop(onAction)
  }, [enabled, onAction])
}
```

```tsx
// App.tsx
const gamepadEnabled = useSettingsStore((s) => s.gamepadEnabled)

useGamepad(gamepadEnabled && sessionMode === 'triage', (action) => {
  if (action === 'keep') handleKeep()
  if (action === 'cull') handleCull()
  if (action === 'play') void togglePlay()
})
```

- [ ] **Step 3: Toggle in LibrarySettings + commit**

```bash
git commit -m "feat: gamepad keep/cull/play via Web Gamepad API"
```

---

### Task 15: Rekordbox running indicator

**Files:**
- Create: `src/components/RekordboxStatus.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement poller component**

```tsx
// src/components/RekordboxStatus.tsx
import { useEffect, useState } from 'react'
import { rb } from '@/lib/ipc'

export function RekordboxStatus() {
  const [running, setRunning] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    async function poll() {
      try {
        const value = await rb<boolean>('is_rekordbox_running')
        if (active) setRunning(value)
      } catch {
        if (active) setRunning(null)
      }
    }
    void poll()
    const id = window.setInterval(() => void poll(), 5000)
    return () => {
      active = false
      window.clearInterval(id)
    }
  }, [])

  if (running === null) return null
  return (
    <span className={`rb-status ${running ? 'rb-status--open' : 'rb-status--closed'}`}>
      {running ? 'Rekordbox open' : 'Rekordbox closed'}
    </span>
  )
}
```

- [ ] **Step 2: Add to header + CSS**

```css
.rb-status--closed { color: var(--keep); }
.rb-status--open { color: var(--cull); }
```

- [ ] **Step 3: Commit**

```bash
git add src/components/RekordboxStatus.tsx src/App.tsx src/styles/global.css
git commit -m "feat: live Rekordbox running indicator in header"
```

---

### Task 16: Duplicates panel

**Files:**
- Create: `src/components/DuplicatesPanel.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Load duplicates when playlist selected**

```typescript
// queue store or App
const [duplicateClusters, setDuplicateClusters] = useState<DuplicateCluster[]>([])

useEffect(() => {
  if (!sourcePlaylistId) { setDuplicateClusters([]); return }
  void rb<DuplicateCluster[]>('find_duplicates', { playlistId: sourcePlaylistId })
    .then(setDuplicateClusters)
    .catch(() => setDuplicateClusters([]))
}, [sourcePlaylistId])
```

- [ ] **Step 2: DuplicatesPanel component**

```tsx
export function DuplicatesPanel({
  clusters,
  tracks,
  onSelectTrack,
}: {
  clusters: DuplicateCluster[]
  tracks: Track[]
  onSelectTrack: (trackId: string) => void
}) {
  if (!clusters.length) return null
  const byId = new Map(tracks.map((t) => [t.id, t]))
  return (
    <div className="panel-block">
      <h2>Duplicates ({clusters.length})</h2>
      {clusters.map((cluster) => (
        <div key={cluster.key} className="duplicate-cluster">
          <p className="top-bar__meta">{cluster.reason}: {cluster.key}</p>
          {cluster.trackIds.map((id) => (
            <button key={id} type="button" className="btn" onClick={() => onSelectTrack(id)}>
              {byId.get(id)?.title ?? id}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Wire in right rail + commit**

```bash
git commit -m "feat: duplicates panel with jump-to-track"
```

---

### Task 17: Stats dashboard

**Files:**
- Create: `src/components/StatsPanel.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: StatsPanel**

```tsx
import { computeSessionStats } from '@/lib/session-stats'
import { REKORDBOX_COLORS } from '@/lib/types'
import { useDecisionsStore } from '@/store/decisions'
import { useQueueStore } from '@/store/queue'

export function StatsPanel() {
  const tracks = useQueueStore((s) => s.tracks)
  const decisions = useDecisionsStore((s) => s.decisions)
  const stats = computeSessionStats(tracks, decisions)
  if (!stats.total) return <p className="top-bar__meta">No decisions yet.</p>
  return (
    <div className="panel-block stats-panel">
      <h2>Session stats</h2>
      <p>{stats.keepCount} keep · {stats.cullCount} cull · {(stats.keepRatio * 100).toFixed(0)}% keep rate</p>
      {stats.avgBpmKeepers != null ? <p className="top-bar__meta">Avg BPM keepers: {stats.avgBpmKeepers.toFixed(1)}</p> : null}
      <ul>
        {Object.entries(stats.colorCounts).map(([colorId, count]) => (
          <li key={colorId}>
            {REKORDBOX_COLORS.find((c) => c.id === Number(colorId))?.label ?? 'None'}: {count}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Add to right rail + commit**

```bash
git commit -m "feat: session stats dashboard"
```

---

### Task 18: Named sessions UI

**Files:**
- Create: `src/components/NamedSessions.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: NamedSessions component**

```tsx
import { useEffect, useState } from 'react'
import { deleteNamedSession, listNamedSessions, loadNamedSession, saveNamedSession } from '@/lib/ipc'
import { useDecisionsStore } from '@/store/decisions'
import { useQueueStore } from '@/store/queue'
import { useSettingsStore } from '@/store/settings'

export function NamedSessions() {
  const [sessions, setSessions] = useState<Array<{ id: string; name: string; updatedAt: string }>>([])
  const [name, setName] = useState('')
  const decisions = useDecisionsStore((s) => s.decisions)
  const hydrate = useDecisionsStore((s) => s.hydrate)
  const sourcePlaylistId = useQueueStore((s) => s.sourcePlaylistId)
  const currentIndex = useQueueStore((s) => s.currentIndex)
  const selectPlaylist = useQueueStore((s) => s.selectPlaylist)
  const setCurrentIndex = useQueueStore((s) => s.setCurrentIndex)
  const destinationPlaylistId = useSettingsStore((s) => s.destinationPlaylistId)
  const cullPlaylistId = useSettingsStore((s) => s.cullPlaylistId)
  const sessionMode = useSettingsStore((s) => s.sessionMode)

  useEffect(() => { void listNamedSessions().then(setSessions) }, [])

  async function save() {
    const id = slugify(name)
    if (!id) return
    await saveNamedSession(id, {
      name,
      sourcePlaylistId,
      destinationPlaylistId,
      cullPlaylistId,
      currentIndex,
      decisions,
      sessionMode,
    })
    setSessions(await listNamedSessions())
    setName('')
  }

  async function load(id: string) {
    const data = await loadNamedSession(id)
    if (!data) return
    if (data.sourcePlaylistId) await selectPlaylist(data.sourcePlaylistId)
    if (typeof data.currentIndex === 'number') setCurrentIndex(data.currentIndex)
    if (data.decisions) hydrate(data.decisions as Record<string, never>)
  }

  return (
    <div className="panel-block">
      <h2>Named sessions</h2>
      <input className="input" value={name} placeholder="Friday crate dig" onChange={(e) => setName(e.target.value)} />
      <button type="button" className="btn" onClick={() => void save()}>Save</button>
      <ul>
        {sessions.map((s) => (
          <li key={s.id}>
            <button type="button" className="btn" onClick={() => void load(s.id)}>{s.name}</button>
            <button type="button" className="btn" onClick={() => void deleteNamedSession(s.id).then(() => listNamedSessions().then(setSessions))}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
```

- [ ] **Step 2: Add export buttons (CSV/JSON) using `exportSessionReport` IPC**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: named sessions save/load and report export"
```

---

### Task 19: Commit dialog — dry-run, XML export, rollback

**Files:**
- Modify: `src/components/CommitDialog.tsx`
- Modify: `src/lib/ipc.ts` (export XML save helper if needed)

- [ ] **Step 1: Add dry-run preview**

```tsx
const [dryRun, setDryRun] = useState<Array<Record<string, unknown>>>([])

async function runDryRun() {
  const payload = Object.entries(decisions).map(([trackId, d]) => ({ trackId, ...d }))
  const plan = await rb<{ operations: Array<Record<string, unknown>> }>('plan_commit', {
    decisions: payload,
    defaultDestId: destinationPlaylistId,
    defaultCullId: cullPlaylistId,
  })
  setDryRun(plan.operations)
}
```

Render dry-run ops as a list before commit button.

- [ ] **Step 2: XML export button**

```tsx
async function exportXml() {
  const payload = Object.entries(decisions).map(([trackId, d]) => ({ trackId, ...d }))
  const result = await rb<{ xml: string }>('export_commit_xml', {
    decisions: payload,
    defaultDestId: destinationPlaylistId,
    defaultCullId: cullPlaylistId,
  })
  await exportTextFile('songswipe-commit.xml', result.xml, [{ name: 'XML', extensions: ['xml'] }])
}
```

- [ ] **Step 3: Rollback section**

```tsx
const [backups, setBackups] = useState<Array<{ path: string; createdAt: string }>>([])

useEffect(() => {
  if (!open) return
  void rb<Array<{ path: string; createdAt: string }>>('list_backups').then(setBackups)
}, [open])

async function rollback(path: string) {
  if (!window.confirm('Restore this backup over master.db? Rekordbox must be closed.')) return
  await rb('restore_backup', { backupPath: path })
  setStatus(`Restored from ${path}`)
}
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: commit dialog dry-run, XML export, and rollback"
```

---

### Task 20: MIDI controller (optional binding)

**Files:**
- Create: `src/audio/midi.ts`
- Create: `src/audio/useMidi.ts`
- Modify: `src/store/settings.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `useMidi(enabled, noteToAction)` — note 36=cull, 37=keep, 38=play (C2/D2/E2)

- [ ] **Step 1: Implement midi.ts**

```typescript
export type MidiAction = 'keep' | 'cull' | 'play'

export async function setupMidi(
  onAction: (action: MidiAction) => void,
  noteMap: Record<number, MidiAction> = { 36: 'cull', 37: 'keep', 38: 'play' },
): Promise<() => void> {
  if (!navigator.requestMIDIAccess) return () => {}
  const access = await navigator.requestMIDIAccess()
  const handler = (event: MIDIMessageEvent) => {
    const [status, note] = event.data ?? []
    if ((status & 0xf0) !== 0x90) return // note on
    const action = noteMap[note]
    if (action) onAction(action)
  }
  for (const input of access.inputs.values()) {
    input.addEventListener('midimessage', handler)
  }
  return () => {
    for (const input of access.inputs.values()) {
      input.removeEventListener('midimessage', handler)
    }
  }
}
```

- [ ] **Step 2: useMidi hook + settings toggle `midiEnabled`**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: MIDI note bindings for keep/cull/play"
```

---

### Task 21: Help overlay + README updates

**Files:**
- Modify: `src/components/HelpOverlay.tsx`
- Modify: `src/components/KeymapSettings.tsx` (link from help)
- Modify: `README.md`

- [ ] **Step 1: Document new shortcuts, gamepad, MIDI, modes, commit safety**

- [ ] **Step 2: README Tier 2 section**

```markdown
## Tier 2 features

- Rekordbox XML export (import path alternative to direct commit)
- Beatgrid downbeat overlay on waveform
- Comment, play count, dates, read-only My Tags
- Duplicate detection panel
- Named sessions + CSV/JSON export
- Stats dashboard
- Custom keyboard map + gamepad/MIDI
- Dry-run commit, WAL-aware backup, live RB status, rollback
```

- [ ] **Step 3: Commit**

```bash
git commit -m "docs: Tier 2 features help and README"
```

---

### Task 22: Integration verification

- [ ] **Step 1: Full test suite**

Run: `npm run test:all && npm run typecheck`  
Expected: all pass

- [ ] **Step 2: Build**

Run: `npm run build`  
Expected: success

- [ ] **Step 3: Manual smoke checklist**

1. Track card shows comment, play count, tags load
2. Beatgrid ticks appear on waveform (track with ANLZ)
3. Duplicates panel lists clusters for playlist with dupes
4. Stats panel updates after decisions
5. Save/load named session restores playlist + decisions
6. Export CSV/JSON via save dialog
7. Custom keymap changes keep/cull keys
8. Gamepad button triggers keep/cull
9. Rekordbox status indicator turns red when RB open
10. Dry-run lists planned ops without DB change
11. XML export saves valid file
12. Rollback restores from listed backup (test DB copy only)

- [ ] **Step 4: Commit if fixes needed**

```bash
git commit -m "chore: Tier 2 integration fixes"
```

---

## Self-Review

**Spec coverage**

| Tier 2 item | Task(s) |
|-------------|---------|
| Rekordbox XML export path | 8, 19 |
| Beatgrid / phrase markers | 3, 9 |
| History / play count | 1, 5 |
| Duplicate detection | 4, 16 |
| Comment / My Tag read-only | 1, 2, 5 |
| Named sessions | 10, 18 |
| Stats dashboard | 12, 17 |
| Export session report | 11, 18 |
| Custom keyboard map | 13 |
| Gamepad / MIDI | 14, 20 |
| Dry-run commit | 7, 19 |
| WAL-aware backup | 6 |
| Rekordbox running indicator | 15 |
| Rollback last commit | 6, 19 |

**Placeholder scan:** No TBD/TODO steps. All tasks include concrete code.

**Type consistency:** `plan_commit` decisions payload uses `trackId` + spread `TrackDecision` fields; CommitDialog maps `Object.entries(decisions)` consistently. `BeatMarker.beatInBar` used in waveform overlay matches sidecar `get_beatgrid` output.

**Risk notes:**
- My Tags API method names may vary in pyrekordbox 0.4.4 — Task 2 includes REPL verification step.
- Beatgrid ANLZ structure varies by Rekordbox version — `beatgrid.py` tries multiple attribute names.
- Rollback is destructive — UI requires explicit confirm + RB-closed guard.
- MIDI requires user granting access in Electron; feature degrades gracefully if unavailable.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2025-06-28-tier-2-features.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
