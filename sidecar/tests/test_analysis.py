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
    
    # Mock librosa feature and segment functions
    with patch("librosa.feature.mfcc") as mock_mfcc, \
         patch("librosa.segment.agglomerative") as mock_agglomerative, \
         patch("librosa.frames_to_time") as mock_time:
         
        # Set up shape mock for n_frames calculation
        mock_mfcc_array = MagicMock()
        mock_mfcc_array.shape = (13, 100)
        mock_mfcc.return_value = mock_mfcc_array
        
        mock_agglomerative.return_value = [0, 40]
        mock_time.return_value = [0.0, 15.0]
        
        result = commands.analyze_track_cues("dummy.wav")
        assert result == [0.0, 15.0]
