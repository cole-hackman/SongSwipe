from duplicates import cluster_duplicates


def test_cluster_duplicates_by_same_path():
    tracks = [
        {"id": "1", "path": "/music/a.mp3", "title": "A", "artist": "X"},
        {"id": "2", "path": "/music/a.mp3", "title": "A copy", "artist": "X"},
        {"id": "3", "path": "/music/b.mp3", "title": "B", "artist": "Y"},
    ]
    clusters = cluster_duplicates(tracks)
    assert len(clusters) == 1
    assert set(clusters[0]["trackIds"]) == {"1", "2"}
    assert clusters[0]["reason"] == "path"
