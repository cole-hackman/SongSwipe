from __future__ import annotations

import os
from typing import Any


def cluster_duplicates(tracks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_path: dict[str, list[str]] = {}
    by_meta: dict[str, list[str]] = {}

    for track in tracks:
        track_id = str(track["id"])
        path = str(track.get("path") or "").strip()
        if path:
            norm = os.path.normcase(os.path.normpath(path))
            by_path.setdefault(norm, []).append(track_id)

        title = str(track.get("title") or "").strip().lower()
        artist = str(track.get("artist") or "").strip().lower()
        if title and artist:
            by_meta.setdefault(f"{artist}::{title}", []).append(track_id)

    clusters: list[dict[str, Any]] = []
    seen: set[frozenset[str]] = set()

    for path, ids in by_path.items():
        if len(ids) < 2:
            continue
        key = frozenset(ids)
        if key in seen:
            continue
        seen.add(key)
        clusters.append({"key": path, "trackIds": ids, "reason": "path"})

    for meta, ids in by_meta.items():
        if len(ids) < 2:
            continue
        key = frozenset(ids)
        if key in seen:
            continue
        seen.add(key)
        clusters.append({"key": meta, "trackIds": ids, "reason": "metadata"})

    return clusters
