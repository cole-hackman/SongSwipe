import json
import subprocess
import sys
from pathlib import Path


BRIDGE = Path(__file__).resolve().parent.parent / "rb_bridge.py"


def run_request(request: dict) -> dict:
    proc = subprocess.run(
        [sys.executable, str(BRIDGE)],
        input=json.dumps(request) + "\n",
        text=True,
        capture_output=True,
        check=True,
    )
    return json.loads(proc.stdout.strip())


def test_ping():
    response = run_request({"id": 1, "method": "ping", "params": {}})
    assert response["id"] == 1
    assert response["result"]["status"] == "pong"
