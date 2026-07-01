"""Rekordbox database commands via pyrekordbox."""

from __future__ import annotations

import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any

import psutil

from beatgrid import beatgrid_from_content
from duplicates import cluster_duplicates
from rating import rating_from_db, rating_to_db
from xml_export import build_commit_xml

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


def _require_content(db: Rekordbox6Database, track_id: str) -> Any:
    content = db.get_content(ID=track_id)
    if content is None:
        raise ValueError(f"Track not found: {track_id}")
    return content


def _resolve_key(db: Rekordbox6Database, key_id: Any) -> str:
    if not key_id:
        return ""
    key_row = db.get_key(ID=key_id)
    if key_row is None:
        return str(key_id)
    return str(getattr(key_row, "ScaleName", None) or key_id)


def ping() -> dict[str, str]:
    return {"status": "pong"}


def is_rekordbox_running() -> bool:
    for proc in psutil.process_iter(["name"]):
        name = (proc.info.get("name") or "").lower()
        if "rekordbox" in name:
            return True
    return False


def _iso_date(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    text = str(value).strip()
    return text or None


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
    wal = _copy_if_exists(
        path.with_name(f"{path.name}-wal"),
        backup.with_name(f"{backup.name}-wal"),
    )
    shm = _copy_if_exists(
        path.with_name(f"{path.name}-shm"),
        backup.with_name(f"{backup.name}-shm"),
    )
    return {"backupPath": str(backup), "walPath": wal, "shmPath": shm}


def list_backups() -> list[dict[str, str]]:
    path = _db_path()
    backups = sorted(path.parent.glob("master.db.songswipe-backup-*"), reverse=True)
    result: list[dict[str, str]] = []
    for backup in backups:
        if backup.name.endswith("-wal") or backup.name.endswith("-shm"):
            continue
        result.append(
            {
                "path": str(backup),
                "createdAt": datetime.fromtimestamp(backup.stat().st_mtime).isoformat(),
            }
        )
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


def _playlist_sort_order(db: Rekordbox6Database) -> dict[str, int]:
    order: dict[str, int] = {}
    playlist_xml = getattr(db, "playlist_xml", None)
    if playlist_xml is None:
        return order

    for index, item in enumerate(playlist_xml.get_playlists()):
        hex_id = str(item.get("Id", "")).strip()
        if not hex_id:
            continue
        try:
            order[str(int(hex_id, 16))] = index
        except ValueError:
            continue
    return order


def get_playlists() -> list[dict[str, Any]]:
    db = open_db()
    sort_order = _playlist_sort_order(db)
    playlists = []
    for playlist in db.get_playlist():
        attribute = int(getattr(playlist, "Attribute", 0) or 0)
        playlist_id = str(playlist.ID)
        parent_id = str(playlist.ParentID) if playlist.ParentID else None
        if parent_id in {"", "0", "root"}:
            parent_id = "root"
        seq = getattr(playlist, "Seq", None)
        sort_index = sort_order.get(playlist_id)
        if sort_index is None and seq is not None:
            sort_index = int(seq)
        playlists.append(
            {
                "id": playlist_id,
                "name": playlist.Name or "",
                "parentId": parent_id,
                "isFolder": attribute == 1,
                "isSmart": attribute == 4,
                "sortIndex": sort_index,
            }
        )
    return playlists


def _track_dict(content: Any, db: Rekordbox6Database) -> dict[str, Any]:
    artist = ""
    if content.ArtistID:
        artist_row = db.get_artist(ID=content.ArtistID)
        if artist_row is not None:
            artist = artist_row.Name or ""

    album = ""
    if content.AlbumID:
        album_row = db.get_album(ID=content.AlbumID)
        if album_row is not None:
            album = album_row.Name or ""

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
        "key": _resolve_key(db, content.KeyID),
        "rating": rating_from_db(int(content.Rating or 0)),
        "colorId": int(content.ColorID or 0),
        "durationSec": float(content.Length or 0),
        "artworkPath": artwork_path,
        "comment": str(getattr(content, "Commnt", None) or ""),
        "playCount": int(getattr(content, "DJPlayCount", 0) or 0),
        "dateAdded": _iso_date(
            getattr(content, "DateCreated", None) or getattr(content, "created_at", None)
        ),
        "lastPlayed": _iso_date(getattr(content, "ReleaseDate", None)),
    }


def _playlist_is_smart(db: Rekordbox6Database, playlist_id: str) -> bool:
    for playlist in db.get_playlist():
        if str(playlist.ID) == str(playlist_id):
            return int(getattr(playlist, "Attribute", 0) or 0) == 4
    return False


def get_tracks(playlist_id: str) -> list[dict[str, Any]]:
    db = open_db()
    songs = db.get_playlist_songs(PlaylistID=playlist_id) or []
    tracks: list[dict[str, Any]] = []
    for song in songs:
        content = db.get_content(ID=song.ContentID)
        if content is None:
            continue
        tracks.append(_track_dict(content, db))
    if not tracks and _playlist_is_smart(db, playlist_id):
        raise RuntimeError(
            "Smart playlist has no cached tracks. Open it once in Rekordbox to refresh, then retry."
        )
    return tracks


def get_playlist_bundle(playlist_id: str, include_cues: bool = True) -> dict[str, Any]:
    tracks = get_tracks(playlist_id)
    if include_cues:
        for track in tracks:
            track["cues"] = get_cues(track["id"])
    return {"tracks": tracks}


def get_playlist_membership(playlist_ids: list[str]) -> dict[str, list[str]]:
    db = open_db()
    result: dict[str, list[str]] = {}
    for playlist_id in playlist_ids:
        songs = db.get_playlist_songs(PlaylistID=playlist_id) or []
        result[str(playlist_id)] = [str(song.ContentID) for song in songs]
    return result


def get_cues(track_id: str) -> list[dict[str, Any]]:
    db = open_db()
    cues = db.get_content_cue(ContentID=track_id) or []
    result: list[dict[str, Any]] = []
    for cue in cues:
        position_ms = getattr(cue, "InMsec", None)
        if position_ms is None:
            in_frame = getattr(cue, "InFrame", None)
            position_ms = int(in_frame) if in_frame is not None else 0
        result.append(
            {
                "name": str(getattr(cue, "Comment", None) or f"Cue {getattr(cue, 'CueID', '')}"),
                "type": int(getattr(cue, "Kind", 0) or 0),
                "positionSec": float(position_ms) / 1000.0,
            }
        )
    return result


def get_my_tags(track_id: str) -> list[str]:
    db = open_db()
    names: list[str] = []
    for tag in db.get_my_tag() or []:
        songs = db.get_my_tag_songs(MyTagID=tag.ID) or []
        if any(str(song.ContentID) == str(track_id) for song in songs):
            if getattr(tag, "Name", None):
                names.append(str(tag.Name))
    return names


def get_beatgrid(track_id: str) -> list[dict[str, Any]]:
    db = open_db()
    content = _require_content(db, track_id)
    return beatgrid_from_content(db, content)


def find_duplicates(playlist_id: str) -> list[dict[str, Any]]:
    tracks = get_tracks(playlist_id)
    return cluster_duplicates(tracks)


def plan_commit(
    decisions: list[dict[str, Any]],
    default_dest_id: str | None = None,
    default_cut_id: str | None = None,
) -> dict[str, list[dict[str, Any]]]:
    operations: list[dict[str, Any]] = []
    for item in decisions:
        track_id = str(item["trackId"])
        if item.get("rating") is not None:
            operations.append(
                {"type": "set_rating", "trackId": track_id, "rating": int(item["rating"])}
            )
        if item.get("colorId") is not None:
            operations.append(
                {"type": "set_color", "trackId": track_id, "colorId": int(item["colorId"])}
            )
        if item.get("keep"):
            dest = item.get("destPlaylistId") or default_dest_id
            if dest:
                operations.append(
                    {
                        "type": "add_to_playlist",
                        "trackId": track_id,
                        "playlistId": str(dest),
                    }
                )
        else:
            cut = item.get("cutPlaylistId") or default_cut_id
            if cut:
                operations.append(
                    {
                        "type": "add_to_playlist",
                        "trackId": track_id,
                        "playlistId": str(cut),
                    }
                )
    return {"operations": operations}


def export_commit_xml(
    decisions: list[dict[str, Any]],
    default_dest_id: str | None = None,
    default_cut_id: str | None = None,
) -> dict[str, Any]:
    plan = plan_commit(decisions, default_dest_id, default_cut_id)
    db = open_db()
    titles: dict[str, str] = {}
    for item in decisions:
        track_id = str(item["trackId"])
        content = db.get_content(ID=track_id)
        titles[track_id] = (
            str(getattr(content, "Title", None) or track_id) if content else track_id
        )
    xml = build_commit_xml(plan["operations"], titles)
    return {"xml": xml, "trackCount": len(decisions)}


def set_rating(track_id: str, rating: int) -> dict[str, bool]:
    if is_rekordbox_running():
        raise RuntimeError("Close Rekordbox before writing to the library.")
    db = open_db()
    content = _require_content(db, track_id)
    content.Rating = rating_to_db(rating)
    db.commit()
    return {"ok": True}


def set_color(track_id: str, color_id: int) -> dict[str, bool]:
    if is_rekordbox_running():
        raise RuntimeError("Close Rekordbox before writing to the library.")
    db = open_db()
    content = _require_content(db, track_id)
    content.ColorID = color_id
    db.commit()
    return {"ok": True}


def create_playlist(name: str, parent_id: str | None = None) -> dict[str, str]:
    if is_rekordbox_running():
        raise RuntimeError("Close Rekordbox before writing to the library.")
    db = open_db()
    playlist = db.create_playlist(name, parent=parent_id)
    db.commit()
    return {"id": str(playlist.ID), "name": playlist.Name or name}


def add_to_playlist(playlist_id: str, track_id: str) -> dict[str, Any]:
    if is_rekordbox_running():
        raise RuntimeError("Close Rekordbox before writing to the library.")
    db = open_db()
    existing = db.get_playlist_songs(PlaylistID=playlist_id) or []
    for song in existing:
        if str(song.ContentID) == str(track_id):
            return {"ok": True, "skipped": True}
    db.add_to_playlist(playlist_id, track_id)
    db.commit()
    return {"ok": True, "skipped": False}


def analyze_track_cues(track_path: str) -> list[float]:
    if not os.path.exists(track_path):
        return []
    try:
        import librosa
        y, sr = librosa.load(track_path, sr=22050)
        # Extract timbral features (MFCCs)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        # Partition audio into k contiguous clusters using Agglomerative Clustering
        n_frames = mfcc.shape[1]
        k = min(10, max(2, n_frames // 10))
        bounds = librosa.segment.agglomerative(mfcc, k)
        boundary_times = librosa.frames_to_time(bounds, sr=sr)
        # Sort and filter boundaries to keep them at least 10 seconds apart
        times = sorted([float(t) for t in boundary_times])
        filtered_times = []
        for t in times:
            if not filtered_times or (t - filtered_times[-1]) >= 10.0:
                filtered_times.append(t)
        return filtered_times
    except Exception as e:
        print(f"Error analyzing track cues: {e}")
        return []


def dispatch(method: str, params: dict[str, Any] | None = None) -> Any:
    params = params or {}
    handlers = {
        "ping": lambda _: ping(),
        "is_rekordbox_running": lambda _: is_rekordbox_running(),
        "backup_db": lambda _: backup_db(),
        "get_playlists": lambda _: get_playlists(),
        "get_tracks": lambda p: get_tracks(p["playlistId"]),
        "get_playlist_bundle": lambda p: get_playlist_bundle(
            p["playlistId"], p.get("includeCues", True)
        ),
        "get_playlist_membership": lambda p: get_playlist_membership(p["playlistIds"]),
        "get_cues": lambda p: get_cues(p["trackId"]),
        "get_my_tags": lambda p: get_my_tags(p["trackId"]),
        "get_beatgrid": lambda p: get_beatgrid(p["trackId"]),
        "find_duplicates": lambda p: find_duplicates(p["playlistId"]),
        "plan_commit": lambda p: plan_commit(
            p["decisions"],
            p.get("defaultDestId"),
            p.get("defaultCutId"),
        ),
        "export_commit_xml": lambda p: export_commit_xml(
            p["decisions"],
            p.get("defaultDestId"),
            p.get("defaultCutId"),
        ),
        "list_backups": lambda _: list_backups(),
        "restore_backup": lambda p: restore_backup(p["backupPath"]),
        "set_rating": lambda p: set_rating(p["trackId"], p["rating"]),
        "set_color": lambda p: set_color(p["trackId"], p["colorId"]),
        "create_playlist": lambda p: create_playlist(p["name"], p.get("parentId")),
        "add_to_playlist": lambda p: add_to_playlist(p["playlistId"], p["trackId"]),
        "analyze_track_cues": lambda p: analyze_track_cues(p["trackPath"]),
        "close_db": lambda _: close_db() or {"ok": True},
    }
    if method not in handlers:
        raise ValueError(f"Unknown method: {method}")
    return handlers[method](params)
