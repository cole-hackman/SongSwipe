import os
from unittest.mock import MagicMock, patch

import pytest

import commands


@pytest.mark.integration
def test_integration_read_and_write_requires_fixture_db():
    db_path = os.environ.get("SONGSWIPE_TEST_DB")
    if not db_path:
        pytest.skip("SONGSWIPE_TEST_DB not set")

    os.environ["SONGSWIPE_DB_PATH"] = db_path
    commands.close_db()

    playlists = commands.get_playlists()
    assert isinstance(playlists, list)

    leaf = next((p for p in playlists if not p["isFolder"] and not p.get("isSmart")), None)
    if leaf is None:
        pytest.skip("No normal playlist in fixture DB")

    tracks = commands.get_tracks(leaf["id"])
    assert isinstance(tracks, list)
    if tracks:
        required = {
            "id",
            "path",
            "title",
            "artist",
            "album",
            "bpm",
            "key",
            "rating",
            "colorId",
            "durationSec",
            "artworkPath",
        }
        assert required.issubset(tracks[0].keys())


@patch("commands.is_rekordbox_running", return_value=False)
@patch("commands.open_db")
def test_add_to_playlist_skips_duplicates(mock_open_db, _mock_running):
    db = MagicMock()
    mock_open_db.return_value = db
    existing = MagicMock(ContentID="track-1")
    db.get_playlist_songs.return_value = [existing]

    result = commands.add_to_playlist("playlist-1", "track-1")

    assert result["skipped"] is True
    db.add_to_playlist.assert_not_called()


@patch("commands.is_rekordbox_running", return_value=False)
@patch("commands.open_db")
def test_write_persistence_mocked(mock_open_db, _mock_running):
    db = MagicMock()
    mock_open_db.return_value = db

    content = MagicMock(Rating=0, ColorID=0)
    db.get_content.return_value = content

    commands.set_rating("track-1", 4)
    assert content.Rating == 204
    db.commit.assert_called()

    commands.set_color("track-1", 5)
    assert content.ColorID == 5
    db.add_to_playlist.assert_not_called()

    commands.add_to_playlist("playlist-1", "track-1")
    db.add_to_playlist.assert_called_once_with("playlist-1", "track-1")
