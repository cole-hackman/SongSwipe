from __future__ import annotations

import xml.etree.ElementTree as ET
from typing import Any


def build_commit_xml(
    operations: list[dict[str, Any]],
    track_titles: dict[str, str],
) -> str:
    root = ET.Element("DJ_PLAYLISTS", Version="1.0.0")
    collection = ET.SubElement(root, "COLLECTION", Entries=str(len(track_titles)))

    ratings: dict[str, int] = {}
    for op in operations:
        if op["type"] == "set_rating":
            ratings[str(op["trackId"])] = int(op["rating"])

    for track_id, title in track_titles.items():
        attrs: dict[str, str] = {"TrackID": track_id, "Name": title}
        if track_id in ratings:
            attrs["Rating"] = str(ratings[track_id] * 51)
        ET.SubElement(collection, "TRACK", **attrs)

    return ET.tostring(root, encoding="unicode")
