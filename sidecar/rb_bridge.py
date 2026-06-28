#!/usr/bin/env python3
"""Line-delimited JSON-RPC bridge for Rekordbox commands."""

from __future__ import annotations

import json
import sys
import traceback
from typing import Any

from commands import dispatch


def handle_request(payload: dict[str, Any]) -> dict[str, Any]:
    request_id = payload.get("id")
    method = payload.get("method")
    params = payload.get("params") or {}
    try:
        result = dispatch(method, params)
        return {"id": request_id, "result": result}
    except Exception as exc:  # noqa: BLE001
        return {
            "id": request_id,
            "error": {
                "message": str(exc),
                "type": exc.__class__.__name__,
                "trace": traceback.format_exc(),
            },
        }


def main() -> None:
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
        except json.JSONDecodeError as exc:
            response = {
                "id": None,
                "error": {"message": f"Invalid JSON: {exc}", "type": "JSONDecodeError"},
            }
        else:
            response = handle_request(payload)
        sys.stdout.write(json.dumps(response) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
