import os
import sys
from pathlib import Path

import pytest

SIDEcar_ROOT = Path(__file__).resolve().parent.parent
if str(SIDEcar_ROOT) not in sys.path:
    sys.path.insert(0, str(SIDEcar_ROOT))

from real_library import ALLOW_REAL_ENV, is_real_library_path  # noqa: E402


def pytest_configure(config):
    test_db = os.environ.get("SONGSWIPE_TEST_DB")
    if test_db and is_real_library_path(test_db):
        raise pytest.UsageError(
            "SONGSWIPE_TEST_DB points at the real Rekordbox library. Use a copy of master.db."
        )


@pytest.fixture(autouse=True)
def _no_real_library(monkeypatch, tmp_path):
    """Every test starts without access to the real library."""
    monkeypatch.delenv(ALLOW_REAL_ENV, raising=False)
    monkeypatch.setenv("SONGSWIPE_DB_PATH", str(tmp_path / "unset.db"))
