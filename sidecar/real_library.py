"""Tells the real Rekordbox library apart from copies and test databases."""

from __future__ import annotations

import os
import sys
from pathlib import Path

ALLOW_REAL_ENV = "SONGSWIPE_ALLOW_REAL"


def default_library_paths() -> list[Path]:
    """Where Rekordbox keeps master.db, per platform."""
    home = Path.home()
    return [
        home / "Library/Pioneer/rekordbox/master.db",
        home / "AppData/Roaming/Pioneer/rekordbox/master.db",
        home / ".rekordbox/master.db",
    ]


def _homes() -> list[Path]:
    homes = [Path.home()]
    if os.name == "posix":
        import pwd

        # HOME can be overridden; the account's home directory cannot.
        homes.append(Path(pwd.getpwuid(os.getuid()).pw_dir))
    return homes


def _library_folders() -> list[Path]:
    folders = []
    for home in _homes():
        folders += [
            home / "Library/Pioneer",
            home / "Library/Application Support/Pioneer",
            home / "AppData/Roaming/Pioneer",
            home / ".rekordbox",
        ]
    appdata = os.environ.get("APPDATA")
    if appdata:
        folders.append(Path(appdata) / "Pioneer")
    return folders


def _same_file(a: Path, b: Path) -> bool:
    try:
        return os.path.samefile(a, b)
    except OSError:
        return False


def is_real_library_path(path: str | os.PathLike[str]) -> bool:
    """True if the path is, or leads into, a Rekordbox library folder."""
    resolved = Path(path).expanduser().resolve()
    parts = [part.casefold() for part in resolved.parts]
    if ("pioneer", "rekordbox") in zip(parts, parts[1:]):
        return True

    for folder in _library_folders():
        # Compare by file identity too: volumes can be case-insensitive.
        target = folder.resolve()
        for candidate in (resolved, *resolved.parents):
            if candidate == target or _same_file(candidate, target):
                return True
        for name in ("rekordbox/master.db", "master.db"):
            if _same_file(resolved, folder / name):
                return True
    return False


def check_library_path(path: Path) -> Path:
    """Refuse the real library unless this process was told to use it."""
    if not is_real_library_path(path):
        return path
    if os.environ.get(ALLOW_REAL_ENV) != "1":
        raise RuntimeError(
            "This is the real Rekordbox library. Set SONGSWIPE_DB_PATH to a copy of "
            f"master.db, or set {ALLOW_REAL_ENV}=1 to use the real library."
        )
    if not getattr(sys, "frozen", False):
        print(
            "WARNING: this is the REAL Rekordbox library. Commits and restores "
            "change the collection Rekordbox opens.",
            file=sys.stderr,
        )
    return path
