import os
import shutil
from unittest.mock import patch

import pytest
from pyrekordbox import Rekordbox6Database
from pyrekordbox.db6 import tables
from sqlalchemy import text

import commands
import library_files


def beside(path, suffix):
    return path.with_name(f"{path.name}{suffix}")


def set_marker(path, value, wal=False):
    """Create or update a small Rekordbox library; `wal` leaves the WAL in place."""
    if not path.exists():
        path.touch()
    db = Rekordbox6Database(path=str(path))
    with db.engine.connect() as connection:
        connection.execute(text("PRAGMA journal_mode=WAL"))
        tables.Base.metadata.create_all(connection)
        connection.execute(text("CREATE TABLE IF NOT EXISTS marker (value TEXT)"))
        connection.execute(text("DELETE FROM marker"))
        connection.execute(text("INSERT INTO marker VALUES (:v)"), {"v": value})
        connection.commit()
        if wal:
            # What an app that is killed leaves behind.
            kept = path.parent / "kept"
            kept.mkdir()
            for suffix in ("", "-wal", "-shm"):
                shutil.copy(beside(path, suffix), kept)
    db.close()
    db.engine.dispose()
    if wal:
        for name in os.listdir(kept):
            os.replace(kept / name, path.parent / name)
        kept.rmdir()


def get_marker(path, tmp_path):
    """Read the marker from a copy, so that reading changes nothing."""
    folder = tmp_path / "read"
    folder.mkdir()
    try:
        for suffix in ("", "-wal"):
            if beside(path, suffix).exists():
                shutil.copy(beside(path, suffix), folder / f"db{suffix}")
        db = Rekordbox6Database(path=str(folder / "db"))
        with db.engine.connect() as connection:
            value = connection.execute(text("SELECT value FROM marker")).scalar()
        db.close()
        db.engine.dispose()
        return value
    finally:
        shutil.rmtree(folder)


@pytest.fixture
def library(tmp_path, monkeypatch):
    folder = tmp_path / "library"
    folder.mkdir()
    path = folder / "master.db"
    set_marker(path, "old")
    monkeypatch.setenv("SONGSWIPE_DB_PATH", str(path))
    monkeypatch.setattr(commands, "is_rekordbox_running", lambda: False)
    yield path
    commands.close_db()


def snapshot(folder):
    return {p.name: p.read_bytes() for p in folder.iterdir()}


def test_backup_copies_wal_and_shm_when_present(library):
    set_marker(library, "new", wal=True)

    result = commands.backup_db()

    for key, suffix in (("backupPath", ""), ("walPath", "-wal"), ("shmPath", "-shm")):
        with open(result[key], "rb") as copy:
            assert copy.read() == beside(library, suffix).read_bytes()


def test_backups_never_overwrite_each_other(library):
    paths = {commands.backup_db()["backupPath"] for _ in range(3)}
    assert len(paths) == 3
    assert {b["path"] for b in commands.list_backups()} == paths


def test_backup_fails_when_the_copy_differs(library):
    def broken(src, dest):
        with open(dest, "wb") as handle:
            handle.write(b"short")

    with patch.object(library_files.shutil, "copy2", broken):
        with pytest.raises(RuntimeError, match="does not match"):
            commands.backup_db()
    assert commands.list_backups() == []


def test_restore_brings_back_the_backup(library, tmp_path):
    backup = commands.backup_db()["backupPath"]
    set_marker(library, "new")

    result = commands.restore_backup(backup)

    assert get_marker(library, tmp_path) == "old"
    assert get_marker(type(library)(result["previousBackupPath"]), tmp_path) == "new"
    assert not list(library.parent.glob(".songswipe-restore-*"))


def test_restore_does_not_replay_the_current_wal(library, tmp_path):
    backup = commands.backup_db()["backupPath"]
    set_marker(library, "new", wal=True)
    assert beside(library, "-wal").stat().st_size > 0

    result = commands.restore_backup(backup)

    for suffix in ("-wal", "-shm"):
        assert not beside(library, suffix).exists()
    assert get_marker(library, tmp_path) == "old"
    # The replaced library is complete, WAL included.
    previous = type(library)(result["previousBackupPath"])
    assert beside(previous, "-wal").exists()
    assert get_marker(previous, tmp_path) == "new"


def test_restore_merges_the_wal_of_the_backup(library, tmp_path):
    set_marker(library, "in-wal", wal=True)
    backup = commands.backup_db()["backupPath"]
    set_marker(library, "later")

    commands.restore_backup(backup)

    assert not beside(library, "-wal").exists()
    assert get_marker(library, tmp_path) == "in-wal"


@pytest.mark.parametrize("kind", ["garbage", "empty", "plain sqlite", "other tables", "truncated"])
def test_restore_rejects_files_that_are_not_a_library(library, kind):
    import sqlite3

    set_marker(library, "new", wal=True)
    backup = library.with_name("master.db.songswipe-backup-20260101-000000")
    if kind == "garbage":
        backup.write_bytes(b"x" * 8192)
    elif kind == "empty":
        backup.touch()
    elif kind == "plain sqlite":
        connection = sqlite3.connect(backup)
        for name in library_files._REQUIRED_TABLES:
            connection.execute(f"CREATE TABLE {name} (ID)")
        connection.close()
    elif kind == "other tables":
        backup.touch()
        db = Rekordbox6Database(path=str(backup))
        with db.engine.connect() as connection:
            connection.execute(text("CREATE TABLE other (ID)"))
            connection.commit()
        db.close()
        db.engine.dispose()
    else:
        backup.write_bytes(library.read_bytes()[: library.stat().st_size // 2])
    before = snapshot(library.parent)

    with pytest.raises(ValueError):
        commands.restore_backup(str(backup))

    assert snapshot(library.parent) == before


def test_restore_accepts_only_backups_of_this_library(library, tmp_path):
    backup = commands.backup_db()["backupPath"]
    outside = tmp_path / "master.db.songswipe-backup-20260101-000000"
    shutil.copy(backup, outside)
    renamed = library.with_name("other.db")
    shutil.copy(backup, renamed)
    link = library.with_name("master.db.songswipe-backup-20260101-000001")
    link.symlink_to(outside)
    before = snapshot(library.parent)

    for path in (outside, renamed, link, library, library.with_name("missing")):
        with pytest.raises(ValueError, match="Choose one of the backups"):
            commands.restore_backup(str(path))

    assert snapshot(library.parent) == before


def test_restore_stops_when_the_current_library_cannot_be_backed_up(library):
    backup = commands.backup_db()["backupPath"]
    set_marker(library, "new", wal=True)
    before = snapshot(library.parent)

    with patch.object(library_files, "create_backup", side_effect=RuntimeError("no space")):
        with pytest.raises(RuntimeError, match="no space"):
            commands.restore_backup(backup)

    assert snapshot(library.parent) == before


def test_failed_replace_keeps_the_current_library(library, tmp_path):
    backup = commands.backup_db()["backupPath"]
    set_marker(library, "new", wal=True)
    replace = os.replace

    def locked(src, dest):
        if str(dest) == str(library):
            raise PermissionError("locked")
        replace(src, dest)

    with patch.object(library_files.os, "replace", locked):
        with pytest.raises(PermissionError):
            commands.restore_backup(backup)

    assert beside(library, "-wal").stat().st_size > 0
    assert get_marker(library, tmp_path) == "new"
    assert not list(library.parent.glob(".songswipe-restore-*"))


def test_restore_refuses_while_rekordbox_runs(library, monkeypatch):
    backup = commands.backup_db()["backupPath"]
    monkeypatch.setattr(commands, "is_rekordbox_running", lambda: True)
    with pytest.raises(RuntimeError, match="Close Rekordbox"):
        commands.restore_backup(backup)
