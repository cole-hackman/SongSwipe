"""Rekordbox database commands via pyrekordbox."""

from __future__ import annotations

import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any

import psutil

try:
    from pyrekordbox import Rekordbox6Database
except ImportError as exc:  # pragma: no cover
    raise RuntimeError("pyrekordbox is required for the sidecar") from exc

_db: Rekordbox6Database | None = None


def _db_path() -> Path:
    override = os.environ.get("SONGSWIPE_DB_PATH")
    if override:
        return Path(override)
    home = Path.home()
    candidates = [
        home / "Library/Pioneer/rekordbox/master.db",
        home / "AppData/Roaming/Pioneer/rekordbox/master.db",
        home / ".rekordbox/master.db",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError(
        "Rekordbox master.db not found. Set SONGSWIPE_DB_PATH or install Rekordbox."
    )


def open_db() -> Rekordbox6Database:
    global _db
    if _db is not None:
        return _db
    path = _db_path()
    _db = Rekordbox6Database(path=str(path))
    return _db


def close_db() -> None:
    global _db
    if _db is not None:
        _db.close()
        _db = None


def ping() -> dict[str, str]:
    return {"status": "pong"}


def is_rekordbox_running() -> bool:
    for proc in psutil.process_iter(["name"]):
        name = (proc.info.get("name") or "").lower()
        if "rekordbox" in name:
            return True
    return False


def backup_db() -> dict[str, str]:
    path = _db_path()
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = path.with_name(f"master.db.songswipe-backup-{stamp}")
    shutil.copy2(path, backup)
    return {"backupPath": str(backup)}


def get_playlists() -> list[dict[str, Any]]:
    db = open_db()
    playlists = []
    for playlist in db.get_playlist():
        playlists.append(
            {
                "id": str(playlist.ID),
                "name": playlist.Name or "",
                "parentId": str(playlist.ParentID) if playlist.ParentID else None,
                "isFolder": bool(getattr(playlist, "Attribute", 0) == 1),
            }
        )
    return playlists


def _track_dict(content: Any, db: Rekordbox6Database) -> dict[str, Any]:
    artist = ""
    if content.ArtistID:
        artist_row = db.get_artist(ID=content.ArtistID)
        if artist_row:
            artist = artist_row[0].Name or ""

    album = ""
    if content.AlbumID:
        album_row = db.get_album(ID=content.AlbumID)
        if album_row:
            album = album_row[0].Name or ""

    artwork_path = None
    if content.ImagePath:
        artwork_path = str(content.ImagePath)

    return {
        "id": str(content.ID),
        "path": str(content.FolderPath or ""),
        "title": str(content.Title or ""),
        "artist": artist,
        "album": album,
        "bpm": float(content.BPM or 0) / 100.0 if content.BPM else None,
        "key": str(content.KeyID or ""),
        "rating": int(content.Rating or 0),
        "colorId": int(content.ColorID or 0),
        "durationSec": float(content.Length or 0) / 1000.0 if content.Length else 0,
        "artworkPath": artwork_path,
    }


def get_tracks(playlist_id: str) -> list[dict[str, Any]]:
    db = open_db()
    songs = db.get_playlist_songs(playlist_id)
    tracks: list[dict[str, Any]] = []
    for song in songs:
        content_rows = db.get_content(ID=song.ContentID)
        if not content_rows:
            continue
        tracks.append(_track_dict(content_rows[0], db))
    return tracks


def get_cues(track_id: str) -> list[dict[str, Any]]:
    db = open_db()
    cues = db.get_content_cue(track_id) or []
    result: list[dict[str, Any]] = []
    for cue in cues:
        position_ms = getattr(cue, "InMsec", None) or getattr(cue, "InMsec", 0) or 0
        result.append(
            {
                "name": str(getattr(cue, "Comment", None) or f"Cue {getattr(cue, 'CueID', '')}"),
                "type": int(getattr(cue, "Kind", 0) or 0),
                "positionSec": float(position_ms) / 1000.0,
            }
        )
    return result


def set_rating(track_id: str, rating: int) -> dict[str, bool]:
    if is_rekordbox_running():
        raise RuntimeError("Close Rekordbox before writing to the library.")
    db = open_db()
    rows = db.get_content(ID=track_id)
    if not rows:
        raise ValueError(f"Track not found: {track_id}")
    content = rows[0]
    content.Rating = max(0, min(5, rating))
    db.commit()
    return {"ok": True}


def set_color(track_id: str, color_id: int) -> dict[str, bool]:
    if is_rekordbox_running():
        raise RuntimeError("Close Rekordbox before writing to the library.")
    db = open_db()
    rows = db.get_content(ID=track_id)
    if not rows:
        raise ValueError(f"Track not found: {track_id}")
    content = rows[0]
    content.ColorID = color_id
    db.commit()
    return {"ok": True}


def create_playlist(name: str, parent_id: str | None = None) -> dict[str, str]:
    if is_rekordbox_running():
        raise RuntimeError("Close Rekordbox before writing to the library.")
    db = open_db()
    playlist = db.create_playlist(name, parent_id=parent_id)
    db.commit()
    return {"id": str(playlist.ID), "name": playlist.Name or name}


def add_to_playlist(playlist_id: str, track_id: str) -> dict[str, bool]:
    if is_rekordbox_running():
        raise RuntimeError("Close Rekordbox before writing to the library.")
    db = open_db()
    db.add_to_playlist(playlist_id, track_id)
    db.commit()
    return {"ok": True}


def dispatch(method: str, params: dict[str, Any] | None = None) -> Any:
    params = params or {}
    handlers = {
        "ping": lambda _: ping(),
        "is_rekordbox_running": lambda _: is_rekordbox_running(),
        "backup_db": lambda _: backup_db(),
        "get_playlists": lambda _: get_playlists(),
        "get_tracks": lambda p: get_tracks(p["playlistId"]),
        "get_cues": lambda p: get_cues(p["trackId"]),
        "set_rating": lambda p: set_rating(p["trackId"], p["rating"]),
        "set_color": lambda p: set_color(p["trackId"], p["colorId"]),
        "create_playlist": lambda p: create_playlist(p["name"], p.get("parentId")),
        "add_to_playlist": lambda p: add_to_playlist(p["playlistId"], p["trackId"]),
        "close_db": lambda _: close_db() or {"ok": True},
    }
    if method not in handlers:
        raise ValueError(f"Unknown method: {method}")
    return handlers[method](params)
