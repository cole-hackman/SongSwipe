from unittest.mock import MagicMock

import commands


def test_track_dict_duration_and_key_and_rating():
    db = MagicMock()
    db.get_artist.return_value = None
    db.get_album.return_value = None
    db.get_key.return_value = MagicMock(ScaleName="8A")

    content = MagicMock(
        ID="track-1",
        FolderPath="/music/track.mp3",
        Title="Track",
        ArtistID=None,
        AlbumID=None,
        ImagePath=None,
        BPM=12800,
        KeyID="key-1",
        Rating=204,
        ColorID=2,
        Length=240,
    )

    track = commands._track_dict(content, db)

    assert track["durationSec"] == 240.0
    assert track["key"] == "8A"
    assert track["rating"] == 4
    db.get_key.assert_called_once_with(ID="key-1")
