from xml_export import build_commit_xml


def test_build_commit_xml_contains_track_nodes():
    xml = build_commit_xml(
        operations=[
            {"type": "set_rating", "trackId": "123", "rating": 4},
        ],
        track_titles={"123": "Test Track"},
    )
    assert "<TRACK" in xml
    assert "123" in xml
    assert "Test Track" in xml
