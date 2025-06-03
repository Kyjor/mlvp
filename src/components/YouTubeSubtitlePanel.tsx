import React from 'react';
import { SubtitleTrack } from '../types';

interface YouTubeSubtitlePanelProps {
  isVisible: boolean;
  subtitleTracks: SubtitleTrack[];
  activeSubtitle: string | null;
  onToggleSubtitle: (trackId: string | null) => void;
  onClose: () => void;
  //onOptionsClick: () => void; // Placeholder for future options functionality
}

export const YouTubeSubtitlePanel: React.FC<YouTubeSubtitlePanelProps> = ({
  isVisible,
  subtitleTracks,
  activeSubtitle,
  onToggleSubtitle,
  onClose,
  //onOptionsClick
}) => {
  if (!isVisible) return null;

  return (
    <div className="ytp-panel" style={{ width: '251px', height: 'auto', maxHeight: '300px' }}>
      <div className="ytp-panel-header">
        <div className="ytp-panel-back-button-container">
          <button 
            className="ytp-button ytp-panel-back-button" 
            aria-label="Back to previous menu"
            onClick={onClose}
            title="Close subtitle panel"
          ></button>
        </div>
        <span className="ytp-panel-title">Subtitles/CC</span>
        {/* <button className="ytp-button ytp-panel-options" onClick={onOptionsClick}>Options</button> */}
      </div>
      <div className="ytp-panel-menu" role="menu" style={{ height: `${Math.max(97, (subtitleTracks.length + 1) * 48)}px` }}>
        <div 
          className={`ytp-menuitem ${!activeSubtitle ? 'ytp-menuitem-active' : ''}`}
          tabIndex={0} 
          role="menuitemradio" 
          aria-checked={!activeSubtitle}
          onClick={() => onToggleSubtitle(null)}
        >
          <div className="ytp-menuitem-label">Off</div>
        </div>
        
        {subtitleTracks.map(track => (
          <div 
            key={track.id}
            className={`ytp-menuitem ${activeSubtitle === track.id ? 'ytp-menuitem-active' : ''}`}
            tabIndex={0} 
            role="menuitemradio" 
            aria-checked={activeSubtitle === track.id}
            onClick={() => onToggleSubtitle(track.id)}
          >
            <div className="ytp-menuitem-label">{track.label}</div>
          </div>
        ))}
      </div>
      <div className="ytp-panel-footer" style={{ width: '251px' }}>
        <div className="ytp-panel-footer-content">
          <span>Subtitles settings.</span>
        </div>
      </div>
    </div>
  );
}; 