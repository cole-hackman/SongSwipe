"""Backup and restore of the library database files."""

from __future__ import annotations

import hashlib
import os
import re
import shutil
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any

from pyrekordbox import Rekordbox6Database
from sqlalchemy import text

BACKUP_PREFIX = "master.db.songswipe-backup-"
_BACKUP_NAME = re.compile(rf"^{re.escape(BACKUP_PREFIX)}\d{{8}}-\d{{6}}(-\d+)?$")
_SIDE_FILES = ("-wal", "-shm", "-journal")
_REQUIRED_TABLES = {"djmdContent", "djmdPlaylist", "djmdSongPlaylist"}


def _beside(path: Path, suffix: str) -> Path:
    return path.with_name(f"{path.name}{suffix}")


def _digest(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(1 << 20):
            digest.update(chunk)
    return digest.hexdigest()


def _copy_verified(src: Path, dest: Path) -> None:
    before = _digest(src)
    shutil.copy2(src, dest)
    if _digest(dest) != before or _digest(src) != before:
        raise RuntimeError(f"Copy of {src.name} does not match the original.")


def _fsync(path: Path) -> None:
    if os.name != "posix" and path.is_dir():
        return
    fd = os.open(path, os.O_RDONLY if os.name == "posix" else os.O_RDWR)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def list_backup_files(db_path: Path) -> list[Path]:
    return sorted(
        (
            path
            for path in db_path.parent.glob(f"{BACKUP_PREFIX}*")
            if _BACKUP_NAME.match(path.name) and path.is_file() and not path.is_symlink()
        ),
        reverse=True,
    )


def create_backup(db_path: Path) -> dict[str, Any]:
    """Copy the database and its side files, checking every copy byte for byte."""
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = db_path.with_name(f"{BACKUP_PREFIX}{stamp}")
    number = 1
    while backup.exists():
        number += 1
        backup = db_path.with_name(f"{BACKUP_PREFIX}{stamp}-{number}")

    # SQLite keeps -wal and -shm beside the file itself, not beside a link to it.
    source = db_path.resolve()
    written: list[Path] = []
    result: dict[str, Any] = {"backupPath": str(backup), "walPath": None, "shmPath": None}
    try:
        for suffix in (*_SIDE_FILES, ""):
            src = _beside(source, suffix)
            if suffix and not src.exists():
                continue
            dest = _beside(backup, suffix)
            written.append(dest)
            _copy_verified(src, dest)
            if suffix in ("-wal", "-shm"):
                result[f"{suffix[1:]}Path"] = str(dest)
    except Exception:
        for path in written:
            path.unlink(missing_ok=True)
        raise
    return result


def _prepare_database(path: Path) -> None:
    """Check that a staged copy is a Rekordbox library and merge its WAL into it."""
    try:
        db = Rekordbox6Database(path=str(path))
        try:
            with db.engine.connect() as connection:
                tables = {
                    row[0]
                    for row in connection.execute(
                        text("SELECT name FROM sqlite_master WHERE type = 'table'")
                    )
                }
                check = connection.execute(text("PRAGMA quick_check")).scalar()
                busy = connection.execute(text("PRAGMA wal_checkpoint(TRUNCATE)")).scalar()
        finally:
            db.close()
            db.engine.dispose()
    except Exception as exc:
        raise ValueError("The backup is not a readable Rekordbox library.") from exc
    if not _REQUIRED_TABLES <= tables:
        raise ValueError("The backup is not a Rekordbox library.")
    if check != "ok" or busy:
        raise ValueError("The backup is damaged.")
    wal = _beside(path, "-wal")
    if wal.exists() and wal.stat().st_size:
        raise ValueError("The backup's write-ahead log could not be merged.")


def restore(db_path: Path, backup_path: str) -> dict[str, Any]:
    """Replace the database with one of its backups.

    The backup is staged, checked and merged with its own WAL first, so that a
    single complete file replaces the database. The current database is backed
    up before that, and its side files never outlive it.
    """
    requested = Path(os.path.abspath(backup_path))
    if requested not in {Path(os.path.abspath(p)) for p in list_backup_files(db_path)}:
        raise ValueError("Choose one of the backups in the library folder.")

    dest = db_path.resolve()
    staging = Path(tempfile.mkdtemp(prefix=".songswipe-restore-", dir=dest.parent))
    keep_staging = False
    try:
        staged = staging / "master.db"
        _copy_verified(requested, staged)
        staged.chmod(staged.stat().st_mode | 0o600)
        # Not -shm: SQLite rebuilds it from the WAL.
        for suffix in ("-wal", "-journal"):
            extra = _beside(requested, suffix)
            if extra.is_file() and not extra.is_symlink():
                _copy_verified(extra, _beside(staged, suffix))
        _prepare_database(staged)
        _fsync(staged)

        previous = create_backup(db_path) if dest.exists() else None

        moved: list[tuple[Path, Path]] = []
        try:
            for suffix in _SIDE_FILES:
                current = _beside(dest, suffix)
                if current.exists():
                    aside = staging / f"previous{suffix}"
                    os.replace(current, aside)
                    moved.append((aside, current))
            os.replace(staged, dest)
        except BaseException:
            keep_staging = True
            for aside, current in reversed(moved):
                os.replace(aside, current)
            keep_staging = False
            raise
        _fsync(dest.parent)
    finally:
        if not keep_staging:
            shutil.rmtree(staging, ignore_errors=True)
    return {"ok": True, "previousBackupPath": previous["backupPath"] if previous else None}
