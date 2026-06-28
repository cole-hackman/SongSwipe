"""Rekordbox star rating scale mapping.

XML export uses 0, 51, 102, 153, 204, 255 for 0-5 stars (pyrekordbox rbxml).
master.db typically stores the same encoded values.
"""

from __future__ import annotations

STARS_TO_DB: dict[int, int] = {0: 0, 1: 51, 2: 102, 3: 153, 4: 204, 5: 255}
DB_TO_STARS: dict[int, int] = {value: stars for stars, value in STARS_TO_DB.items()}


def rating_from_db(value: int | None) -> int:
    if value is None:
        return 0
    if value in DB_TO_STARS:
        return DB_TO_STARS[value]
    if 0 <= value <= 5:
        return value
    return 0


def rating_to_db(stars: int) -> int:
    clamped = max(0, min(5, stars))
    return STARS_TO_DB[clamped]
