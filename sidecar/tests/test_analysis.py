import os
from unittest.mock import patch, MagicMock
import pytest
import commands

def test_analyze_track_cues_handles_missing_file():
    # Calling on a non-existent file path should return an empty list
    result = commands.analyze_track_cues("non_existent_file.wav")
    assert result == []

@patch("os.path.exists")
@patch("librosa.load")
def test_analyze_track_cues_returns_onset_times(mock_load, mock_exists):
    mock_exists.return_value = True
    
    # Mock librosa.load return values: y (dummy array), sr (dummy sample rate)
    mock_load.return_value = (MagicMock(), 22050)
    
    # Mock librosa onset functions
    with patch("librosa.onset.onset_strength") as mock_strength, \
         patch("librosa.onset.onset_detect") as mock_detect, \
         patch("librosa.frames_to_time") as mock_time:
         
        mock_detect.return_value = [10, 20]
        mock_time.return_value = [0.5, 1.0]
        
        result = commands.analyze_track_cues("dummy.wav")
        assert result == [0.5, 1.0]
