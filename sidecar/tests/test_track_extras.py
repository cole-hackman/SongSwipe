from datetime import datetime
from unittest.mock import MagicMock, patch

import commands


def test_track_dict_includes_comment_and_play_count():
    db = MagicMock()
    db.get_artist.return_value = None
    db.get_album.return_value = None
    db.get_key.return_value = None

    created = datetime(2024, 1, 15, 12, 0, 0)
    content = MagicMock(
        ID="t1",
        FolderPath="/music/a.mp3",
        Title="A",
        ArtistID=None,
        AlbumID=None,
        ImagePath=None,
        BPM=None,
        KeyID=None,
        Rating=0,
        ColorID=0,
        Length=180,
        Commnt="Great opener",
        DJPlayCount=12,
        created_at=created,
        DateCreated=created,
        ReleaseDate=None,
    )

    track = commands._track_dict(content, db)

    assert track["comment"] == "Great opener"
    assert track["playCount"] == 12
    assert track["dateAdded"] is not None


@patch("commands.open_db")
def test_get_my_tags_returns_tag_names(mock_open_db):
    db = MagicMock()
    mock_open_db.return_value = db
    tag = MagicMock(ID="tag-1", Name="Peak Hour")
    song = MagicMock(ContentID="track-1")
    db.get_my_tag.return_value = [tag]
    db.get_my_tag_songs.return_value = [song]

    tags = commands.get_my_tags("track-1")

    assert tags == ["Peak Hour"]
