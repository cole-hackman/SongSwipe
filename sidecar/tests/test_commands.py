from unittest.mock import MagicMock, patch

import commands


def test_ping():
    assert commands.ping() == {"status": "pong"}


@patch("commands.psutil.process_iter")
def test_is_rekordbox_running(mock_iter):
    mock_iter.return_value = [MagicMock(info={"name": "rekordbox"})]
    assert commands.is_rekordbox_running() is True


def test_dispatch_unknown_method():
    try:
        commands.dispatch("nope", {})
        assert False, "expected ValueError"
    except ValueError as exc:
        assert "Unknown method" in str(exc)


@patch("commands.open_db")
def test_get_tracks_uses_keyword_args_and_single_content(mock_open_db):
    db = MagicMock()
    mock_open_db.return_value = db

    song = MagicMock(ContentID="content-1")
    db.get_playlist_songs.return_value = [song]

    content = MagicMock(
        ID="content-1",
        FolderPath="/music/track.mp3",
        Title="Track",
        ArtistID=None,
        AlbumID=None,
        ImagePath=None,
        BPM=12800,
        KeyID="1",
        Rating=204,
        ColorID=2,
        Length=240,
    )
    db.get_content.return_value = content
    db.get_key.return_value = MagicMock(ScaleName="8A")

    tracks = commands.get_tracks("playlist-1")

    db.get_playlist_songs.assert_called_once_with(PlaylistID="playlist-1")
    db.get_content.assert_called_once_with(ID="content-1")
    assert len(tracks) == 1
    assert tracks[0]["title"] == "Track"
    assert tracks[0]["durationSec"] == 240.0
    assert tracks[0]["rating"] == 4
    assert tracks[0]["key"] == "8A"


@patch("commands.open_db")
def test_get_cues_uses_content_id_kwarg(mock_open_db):
    db = MagicMock()
    mock_open_db.return_value = db
    cue = MagicMock(Comment="Drop", Kind=1, InMsec=45000, CueID=1)
    db.get_content_cue.return_value = [cue]

    cues = commands.get_cues("track-1")

    db.get_content_cue.assert_called_once_with(ContentID="track-1")
    assert cues[0]["positionSec"] == 45.0


@patch("commands.is_rekordbox_running", return_value=False)
@patch("commands.open_db")
def test_create_playlist_uses_parent_kwarg(mock_open_db, _mock_running):
    db = MagicMock()
    mock_open_db.return_value = db
    playlist = MagicMock(ID="pl-1", Name="Keepers")
    db.create_playlist.return_value = playlist

    result = commands.create_playlist("Keepers", parent_id="parent-1")

    db.create_playlist.assert_called_once_with("Keepers", parent="parent-1")
    assert result["id"] == "pl-1"
