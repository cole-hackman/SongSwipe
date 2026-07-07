from unittest.mock import patch

import commands


@patch("commands.shutil.copy2")
@patch("commands.is_rekordbox_running", return_value=False)
@patch("commands._db_path")
def test_backup_db_copies_wal_and_shm_when_present(mock_db_path, _mock_running, mock_copy, tmp_path):
    base = tmp_path / "master.db"
    mock_db_path.return_value = base
    base.write_text("db")
    wal = base.with_name("master.db-wal")
    shm = base.with_name("master.db-shm")
    wal.write_text("wal")
    shm.write_text("shm")

    result = commands.backup_db()

    assert "backupPath" in result
    assert mock_copy.call_count >= 3
