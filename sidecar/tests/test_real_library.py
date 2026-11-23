import os
import subprocess
import sys
from pathlib import Path

import pytest

import commands
import real_library

TESTS = Path(__file__).resolve().parent


@pytest.fixture
def fake_home(tmp_path, monkeypatch):
    home = tmp_path / "home"
    folder = home / "Library/Pioneer/rekordbox"
    folder.mkdir(parents=True)
    (folder / "master.db").write_text("library")
    monkeypatch.setattr(real_library.Path, "home", classmethod(lambda cls: home))
    return home


def test_default_path_is_refused(fake_home, monkeypatch):
    monkeypatch.delenv("SONGSWIPE_DB_PATH")
    with pytest.raises(RuntimeError, match="SONGSWIPE_DB_PATH"):
        commands._db_path()


def test_explicit_real_path_is_refused(fake_home, monkeypatch):
    real = fake_home / "Library/Pioneer/rekordbox/master.db"
    monkeypatch.setenv("SONGSWIPE_DB_PATH", str(real))
    with pytest.raises(RuntimeError, match="real Rekordbox library"):
        commands.open_db()


@pytest.mark.parametrize("value", ["0", "", "yes"])
def test_opt_in_needs_the_exact_value(fake_home, monkeypatch, value):
    monkeypatch.delenv("SONGSWIPE_DB_PATH")
    monkeypatch.setenv(real_library.ALLOW_REAL_ENV, value)
    with pytest.raises(RuntimeError):
        commands._db_path()


def test_opt_in_allows_the_real_path_with_a_warning(fake_home, monkeypatch, capsys):
    monkeypatch.delenv("SONGSWIPE_DB_PATH")
    monkeypatch.setenv(real_library.ALLOW_REAL_ENV, "1")
    assert commands._db_path() == fake_home / "Library/Pioneer/rekordbox/master.db"
    captured = capsys.readouterr()
    assert captured.err.startswith("WARNING: this is the REAL Rekordbox library")
    assert captured.out == ""


def test_links_to_the_real_library_count_as_real(fake_home, tmp_path):
    real = fake_home / "Library/Pioneer/rekordbox/master.db"
    link = tmp_path / "link.db"
    link.symlink_to(real)
    folder = tmp_path / "folder"
    folder.symlink_to(real.parent)
    hard = tmp_path / "hard.db"
    os.link(real, hard)
    for path in (link, folder / "master.db", hard, tmp_path / "home/library/pioneer/x.db"):
        if path.parent.exists():
            assert real_library.is_real_library_path(path), path


def test_home_override_does_not_hide_the_account_library(monkeypatch, tmp_path):
    pwd = pytest.importorskip("pwd")
    home = pwd.getpwuid(os.getuid()).pw_dir
    monkeypatch.setenv("HOME", str(tmp_path))
    assert real_library.is_real_library_path(f"{home}/Library/Pioneer/other/master.db")


def test_copies_are_allowed(fake_home, monkeypatch, tmp_path):
    copy = tmp_path / "master.db"
    copy.write_text("copy")
    monkeypatch.setenv("SONGSWIPE_DB_PATH", str(copy))
    assert commands._db_path() == copy


@pytest.mark.parametrize("allow", ["", "1"])
def test_test_suite_refuses_the_real_library(tmp_path, allow):
    real = tmp_path / "Pioneer/rekordbox/master.db"
    env = {**os.environ, "SONGSWIPE_TEST_DB": str(real), real_library.ALLOW_REAL_ENV: allow}
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "--collect-only", "-q", str(TESTS / "test_rating.py")],
        env=env,
        cwd=TESTS.parent,
        text=True,
        capture_output=True,
    )
    assert result.returncode == pytest.ExitCode.USAGE_ERROR
    assert "real Rekordbox library" in result.stderr
