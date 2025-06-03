import React from 'react';
import { SubtitleTrack } from '../types';
import { SubtitleTimingControl } from './SubtitleTimingControl';

interface SubtitleControlsProps {
  subtitleTracks: SubtitleTrack[];
  activeSubtitle: string | null;
  subtitlePosition: { x: number; y: number };
  subtitleSize: number;
  subtitleOffset: number;
  onToggleSubtitle: (trackId: string | null) => void;
  onRemoveSubtitle: (trackId: string) => void;
  onResetPosition: () => void;
  onResetSize: () => void;
  onOffsetChange: (newOffset: number) => void;
}

export const SubtitleControls: React.FC<SubtitleControlsProps> = ({
  subtitleTracks,
  activeSubtitle,
  subtitlePosition,
  subtitleSize,
  subtitleOffset,
  onToggleSubtitle,
  onRemoveSubtitle,
  onResetPosition,
  onResetSize,
  onOffsetChange
}) => {
  if (subtitleTracks.length === 0) return null;

  return (
    <div className="subtitle-controls">
      <div className="subtitle-selector">
        <label>Subtitles:</label>
        <select 
          value={activeSubtitle || ''} 
          onChange={(e) => onToggleSubtitle(e.target.value || null)}
          disabled={subtitleTracks.length === 0}
        >
          <option value="">Off</option>
          {subtitleTracks.map(track => (
            <option key={track.id} value={track.id}>
              {track.label}
            </option>
          ))}
        </select>
      </div>
      
      {(activeSubtitle || subtitleTracks.length > 0) && (
        <>
          <div className="subtitle-customization">
            <div className="customization-header">
              <span>📐 Subtitle Appearance</span>
            </div>
            <div className="customization-controls">
              <div className="control-group">
                <label>Position: {subtitlePosition.x.toFixed(0)}%, {subtitlePosition.y.toFixed(0)}%</label>
                <button 
                  className="reset-btn"
                  onClick={onResetPosition}
                  title="Reset position to center bottom"
                  disabled={!activeSubtitle}
                >
                  Reset Position
                </button>
              </div>
              <div className="control-group">
                <label>Size: {subtitleSize}%</label>
                <button 
                  className="reset-btn"
                  onClick={onResetSize}
                  title="Reset size to 100%"
                  disabled={!activeSubtitle}
                >
                  Reset Size
                </button>
              </div>
            </div>
            <div className="control-instructions">
              <p>💡 <strong>Drag Up/Right</strong> to make subtitles bigger</p>
              <p>💡 <strong>Drag Down/Left</strong> to make subtitles smaller</p>
              <p>💡 <strong>Ctrl + Drag</strong> to move subtitles</p>
              <p>💡 <strong>Ctrl + Scroll</strong> to resize precisely</p>
            </div>
          </div>

          <SubtitleTimingControl 
            currentOffset={subtitleOffset}
            onOffsetChange={onOffsetChange}
          />
        </>
      )}
      
      {subtitleTracks.length > 0 && (
        <div className="subtitle-list-container">
          <div className="list-header">Loaded Subtitle Files:</div>
          <div className="subtitle-list">
            {subtitleTracks.map(track => (
              <div key={track.id} className={`subtitle-item ${activeSubtitle === track.id ? 'active' : ''}`}>
                <span className="subtitle-name" title={track.label}>{track.label}</span>
                <button 
                  onClick={() => onRemoveSubtitle(track.id)}
                  className="remove-subtitle"
                  title="Remove subtitle"
                >
                  ❌
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 