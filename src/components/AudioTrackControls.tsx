import React from 'react';
import { AudioTrack } from '../types';

interface AudioTrackControlsProps {
  audioTracks: AudioTrack[];
  activeAudioTrack: string | null;
  isSupported: boolean;
  onSwitchAudioTrack: (trackId: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

export const AudioTrackControls: React.FC<AudioTrackControlsProps> = ({
  audioTracks,
  activeAudioTrack,
  isSupported,
  onSwitchAudioTrack,
  isVisible,
  onClose
}) => {
  if (!isVisible || !isSupported || audioTracks.length <= 1) {
    return null;
  }

  const formatTrackLabel = (track: AudioTrack): string => {
    let label = track.label;
    if (track.language) {
      label += ` (${track.language.toUpperCase()})`;
    }
    return label;
  };

  return (
    <div className="audio-track-panel">
      <div className="audio-track-header">
        <h3>🔊 Audio Tracks</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="audio-track-list">
        {audioTracks.map((track) => (
          <div
            key={track.id}
            className={`audio-track-item ${
              activeAudioTrack === track.id ? 'active' : ''
            }`}
            onClick={() => onSwitchAudioTrack(track.id)}
          >
            <div className="audio-track-info">
              <div className="audio-track-label">
                {formatTrackLabel(track)}
              </div>
              {track.kind && track.kind !== 'main' && (
                <div className="audio-track-kind">
                  {track.kind}
                </div>
              )}
            </div>
            <div className="audio-track-status">
              {activeAudioTrack === track.id ? (
                <span className="track-indicator active">●</span>
              ) : (
                <span className="track-indicator">○</span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="audio-track-info-text">
        <p>📝 Click on an audio track to switch to it</p>
        <p>Current: {activeAudioTrack ? 
          formatTrackLabel(audioTracks.find(t => t.id === activeAudioTrack) || audioTracks[0]) : 
          'None'
        }</p>
      </div>
    </div>
  );
}; 