import React from 'react';
import { SubtitleTrack } from '../types';
import { SubtitleTimingControl } from './SubtitleTimingControl';

interface SubtitleControlsProps {
  subtitleTracks: SubtitleTrack[];
  activeSubtitle: string | null;
  secondarySubtitle: string | null;
  subtitlePosition: { x: number; y: number };
  subtitleSize: number;
  subtitleOffset: number;
  secondarySubtitleOffset: number;
  onToggleSubtitle: (trackId: string | null) => void;
  onToggleSecondarySubtitle: (trackId: string | null) => void;
  onRemoveSubtitle: (trackId: string) => void;
  onResetPosition: () => void;
  onResetSize: () => void;
  onOffsetChange: (newOffset: number) => void;
  onSecondaryOffsetChange: (newOffset: number) => void;
}

export const SubtitleControls: React.FC<SubtitleControlsProps> = ({
  subtitleTracks,
  activeSubtitle,
  secondarySubtitle,
  subtitlePosition,
  subtitleSize,
  subtitleOffset,
  secondarySubtitleOffset,
  onToggleSubtitle,
  onToggleSecondarySubtitle,
  onRemoveSubtitle,
  onResetPosition,
  onResetSize,
  onOffsetChange,
  onSecondaryOffsetChange
}) => {
  if (subtitleTracks.length === 0) return null;

  return (
    <div className="subtitle-controls">
      <div className="dual-subtitle-selectors">
        <div className="subtitle-selector primary-selector">
          <label>Primary Subtitles:</label>
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
        
        <div className="subtitle-selector secondary-selector">
          <label>Secondary Subtitles:</label>
          <select 
            value={secondarySubtitle || ''} 
            onChange={(e) => onToggleSecondarySubtitle(e.target.value || null)}
            disabled={subtitleTracks.length === 0}
          >
            <option value="">Off</option>
            {subtitleTracks.map(track => (
              <option key={track.id} value={track.id} disabled={track.id === activeSubtitle}>
                {track.label} {track.id === activeSubtitle ? "(Used as Primary)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {(activeSubtitle || secondarySubtitle || subtitleTracks.length > 0) && (
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
                  disabled={!activeSubtitle && !secondarySubtitle}
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
                  disabled={!activeSubtitle && !secondarySubtitle}
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

          <div className="dual-timing-controls">
            {activeSubtitle && (
              <div className="timing-control-section primary-timing">
                <h4>Primary Subtitle Timing</h4>
                <SubtitleTimingControl 
                  currentOffset={subtitleOffset}
                  onOffsetChange={onOffsetChange}
                />
              </div>
            )}
            
            {secondarySubtitle && (
              <div className="timing-control-section secondary-timing">
                <h4>Secondary Subtitle Timing</h4>
                <SubtitleTimingControl 
                  currentOffset={secondarySubtitleOffset}
                  onOffsetChange={onSecondaryOffsetChange}
                />
              </div>
            )}
          </div>
        </>
      )}
      
      {subtitleTracks.length > 0 && (
        <div className="subtitle-list-container">
          <div className="list-header">Loaded Subtitle Files:</div>
          <div className="subtitle-list">
            {subtitleTracks.map(track => (
              <div key={track.id} className={`subtitle-item ${
                activeSubtitle === track.id ? 'active primary' : 
                secondarySubtitle === track.id ? 'active secondary' : ''
              }`}>
                <span className="subtitle-name" title={track.label}>
                  {track.label}
                  {activeSubtitle === track.id && <span className="track-label"> (Primary)</span>}
                  {secondarySubtitle === track.id && <span className="track-label"> (Secondary)</span>}
                </span>
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