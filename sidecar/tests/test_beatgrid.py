from unittest.mock import MagicMock, patch

import commands


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
