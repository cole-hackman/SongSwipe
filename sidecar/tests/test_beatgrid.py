from unittest.mock import MagicMock, patch

import numpy as np

import commands
from beatgrid import beatgrid_from_content


class _FakeGrid:
    """Mimics pyrekordbox PQTZAnlzTag, whose values are numpy arrays."""

    def get(self):
        beats = np.array([1, 2, 3, 4], dtype=np.int8)
        bpms = np.array([128.0, 128.0, 128.0, 128.0])
        times = np.array([0.0, 0.46875, 0.9375, 1.40625])
        return beats, bpms, times


class _FakeAnlz:
    def get_tag(self, name):
        return _FakeGrid() if name == "beat_grid" else None


def test_beatgrid_from_content_handles_numpy_arrays():
    db = MagicMock()
    db.read_anlz_files.return_value = {"/track.DAT": _FakeAnlz()}

    result = beatgrid_from_content(db, object())

    assert len(result) == 4
    assert result[0] == {"positionSec": 0.0, "bpm": 128.0, "beatInBar": 1}
    assert result[1]["beatInBar"] == 2


def test_beatgrid_from_content_returns_empty_without_grid():
    db = MagicMock()
    anlz = MagicMock()
    anlz.get_tag.return_value = None
    db.read_anlz_files.return_value = {"/track.DAT": anlz}

    assert beatgrid_from_content(db, object()) == []


@patch("commands.beatgrid_from_content")
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
