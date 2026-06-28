from __future__ import annotations

from typing import Any


def beatgrid_from_content(db: Any, content: Any) -> list[dict[str, float | int | None]]:
    try:
        anlz_files = db.read_anlz_files(content)
    except Exception:
        return []

    beats: list[dict[str, float | int | None]] = []
    for anlz in anlz_files:
        grid = anlz.get_tag("beat_grid")
        if grid is None:
            continue
        entries = getattr(grid, "beats", None) or getattr(grid, "beat_entries", None) or []
        for entry in entries:
            time_ms = float(getattr(entry, "time", 0) or 0)
            tempo = getattr(entry, "tempo", None)
            bpm = float(tempo) / 100.0 if tempo else None
            beats.append(
                {
                    "positionSec": time_ms / 1000.0,
                    "bpm": bpm,
                    "beatInBar": int(getattr(entry, "beat_number", 0) or 0),
                }
            )
        if beats:
            break
    return beats
