from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

import commands


def _tag(id_, name, attribute, parent, seq=0):
    return SimpleNamespace(ID=id_, Name=name, Attribute=attribute, ParentID=parent, Seq=seq)


TAGS = [
    _tag("1", "Genre", 1, "root", 1),
    _tag("10", "Techno", 0, "1", 1),
    _tag("20", "Deep House", 0, "1", 2),
    _tag("30", "Vocal", 0, "1", 3),
    _tag("2", "Situation", 1, "root", 2),
    _tag("40", "Peak Time", 0, "2", 1),
]


@patch("commands.open_db")
def test_get_my_tag_tree_groups_by_category(mock_open_db):
    db = MagicMock()
    db.get_my_tag.return_value = TAGS
    mock_open_db.return_value = db

    tree = commands.get_my_tag_tree()

    assert [c["name"] for c in tree] == ["Genre", "Situation"]
    genre = tree[0]
    assert [t["name"] for t in genre["tags"]] == ["Techno", "Deep House", "Vocal"]
    # categories (Attribute=1) never appear as assignable tags
    assert all(t["id"] not in {"1", "2"} for c in tree for t in c["tags"])


@patch("commands.open_db")
def test_get_my_tags_returns_id_and_name(mock_open_db):
    db = MagicMock()
    db.get_my_tag.return_value = TAGS
    db.query.return_value.filter_by.return_value.all.return_value = [
        SimpleNamespace(MyTagID="10"),
        SimpleNamespace(MyTagID="40"),
    ]
    mock_open_db.return_value = db

    result = commands.get_my_tags("track-1")

    assert result == [
        {"id": "10", "name": "Techno"},
        {"id": "40", "name": "Peak Time"},
    ]


@patch("commands.is_rekordbox_running", return_value=False)
@patch("commands.open_db")
def test_set_my_tags_rejects_unknown_or_category(mock_open_db, _running):
    db = MagicMock()
    db.get_my_tag.return_value = TAGS
    db.get_content.return_value = SimpleNamespace(ID="track-1")
    mock_open_db.return_value = db

    with pytest.raises(ValueError):
        commands.set_my_tags("track-1", ["999"])  # unknown id
    with pytest.raises(ValueError):
        commands.set_my_tags("track-1", ["1"])  # category id, not a tag


@patch("commands.is_rekordbox_running", return_value=False)
@patch("commands.open_db")
def test_set_my_tags_adds_and_removes(mock_open_db, _running):
    db = MagicMock()
    db.get_my_tag.return_value = TAGS
    db.get_content.return_value = SimpleNamespace(ID="track-1")
    # Track currently has tags 10 and 20 assigned
    existing_rows = [
        SimpleNamespace(MyTagID="10"),
        SimpleNamespace(MyTagID="20"),
    ]
    query = db.query.return_value.filter_by.return_value
    query.all.return_value = existing_rows
    query.count.return_value = 0
    mock_open_db.return_value = db

    # Desired: keep 10, drop 20, add 30
    result = commands.set_my_tags("track-1", ["10", "30"])

    # removed the row for tag 20
    db.delete.assert_called_once_with(existing_rows[1])
    # added exactly one row (tag 30)
    assert db.add.call_count == 1
    db.commit.assert_called_once()
    assert result == {"ok": True, "tagIds": ["10", "30"]}


@patch("commands.is_rekordbox_running", return_value=True)
@patch("commands.open_db")
def test_set_my_tags_blocked_when_rekordbox_running(mock_open_db, _running):
    with pytest.raises(RuntimeError):
        commands.set_my_tags("track-1", ["10"])
