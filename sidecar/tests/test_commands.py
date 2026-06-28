from unittest.mock import MagicMock, patch

import commands


def test_ping():
    assert commands.ping() == {"status": "pong"}


@patch("commands.psutil.process_iter")
def test_is_rekordbox_running(mock_iter):
    mock_iter.return_value = [MagicMock(info={"name": "rekordbox"})]
    assert commands.is_rekordbox_running() is True


def test_dispatch_unknown_method():
    try:
        commands.dispatch("nope", {})
        assert False, "expected ValueError"
    except ValueError as exc:
        assert "Unknown method" in str(exc)
