from unittest.mock import MagicMock, patch

import commands


@patch("commands.open_db")
def test_get_playlist_bundle_includes_cues(mock_open_db):
    db = MagicMock()
    mock_open_db.return_value = db

    song = MagicMock(ContentID="c1")
    db.get_playlist_songs.return_value = [song]

    content = MagicMock(
        ID="c1",
        FolderPath="/music/a.mp3",
        Title="A",
        ArtistID=None,
        AlbumID=None,
        ImagePath=None,
        BPM=12800,
        KeyID=None,
        Rating=0,
        ColorID=0,
        Length=180,
    )
    db.get_content.return_value = content
    cue = MagicMock(Comment="Drop", Kind=1, InMsec=60000, CueID=1)
    db.get_content_cue.return_value = [cue]

    bundle = commands.get_playlist_bundle("pl-1", include_cues=True)

    assert len(bundle["tracks"]) == 1
    assert bundle["tracks"][0]["cues"][0]["positionSec"] == 60.0


@patch("commands.open_db")
def test_get_playlist_bundle_omits_cues_when_disabled(mock_open_db):
    db = MagicMock()
    mock_open_db.return_value = db
    db.get_playlist_songs.return_value = []
    bundle = commands.get_playlist_bundle("pl-1", include_cues=False)
    assert bundle == {"tracks": []}


@patch("commands.open_db")
def test_get_playlist_membership_returns_track_ids_per_playlist(mock_open_db):
    db = MagicMock()
    mock_open_db.return_value = db

    def songs_side_effect(PlaylistID):
        if PlaylistID == "keep-pl":
            return [MagicMock(ContentID="t1"), MagicMock(ContentID="t2")]
        if PlaylistID == "cull-pl":
            return [MagicMock(ContentID="t2")]
        return []

    db.get_playlist_songs.side_effect = songs_side_effect

    result = commands.get_playlist_membership(["keep-pl", "cull-pl"])

    assert result == {"keep-pl": ["t1", "t2"], "cull-pl": ["t2"]}


@patch("commands.open_db")
def test_get_tracks_smart_playlist_empty_raises_helpful_error(mock_open_db):
    db = MagicMock()
    mock_open_db.return_value = db
    smart = MagicMock(ID="smart-1", Attribute=4, Name="Unrated")
    db.get_playlist.return_value = [smart]
    db.get_playlist_songs.return_value = []

    try:
        commands.get_tracks("smart-1")
        assert False, "expected RuntimeError"
    except RuntimeError as exc:
        assert "smart playlist" in str(exc).lower()
        assert "rekordbox" in str(exc).lower()
