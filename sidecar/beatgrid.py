from __future__ import annotations

from typing import Any


def beatgrid_from_content(db: Any, content: Any) -> list[dict[str, float | int | None]]:
    try:
        anlz_files = db.read_anlz_files(content)
    except Exception:
        return []

    beats: list[dict[str, float | int | None]] = []
    for anlz in anlz_files.values():
        grid = anlz.get_tag("beat_grid")
        if grid is None:
            continue
        # pyrekordbox exposes the beat grid as numpy arrays via ``get()``:
        # beat numbers (1-4), bpms (already real BPM) and times (seconds).
        # Note: ``grid.beats``/``grid.times`` are numpy arrays, so they must
        # never be used in boolean context (``x or y`` raises "truth value of
        # an array is ambiguous").
        try:
            beat_numbers, bpms, times = grid.get()
        except Exception:
            continue
        for beat_number, bpm, time_sec in zip(beat_numbers, bpms, times):
            bpm_value = float(bpm)
            beats.append(
                {
                    "positionSec": float(time_sec),
                    "bpm": bpm_value if bpm_value > 0 else None,
                    "beatInBar": int(beat_number),
                }
            )
        if beats:
            break
    return beats
