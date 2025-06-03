import React from 'react';
import { SubtitleCue } from '../types';

interface SubtitleOverlayProps {
  currentCues: SubtitleCue[];
  subtitlePosition: { x: number; y: number };
  subtitleSize: number;
  isDraggingSubtitle: boolean;
  subtitleRef: React.RefObject<HTMLDivElement>;
  onMouseDown: (e: React.MouseEvent) => void;
  onWheel: (e: React.WheelEvent) => void;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  currentCues,
  subtitlePosition,
  subtitleSize,
  isDraggingSubtitle,
  subtitleRef,
  onMouseDown,
  onWheel
}) => {
  if (currentCues.length === 0) return null;

  return (
    <div 
      className="subtitle-overlay-container"
      style={{
        position: 'absolute',
        left: `${subtitlePosition.x}%`,
        top: `${subtitlePosition.y}%`,
        transform: 'translate(-50%, -50%)',
        cursor: isDraggingSubtitle ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
      ref={subtitleRef}
      onMouseDown={onMouseDown}
      onWheel={onWheel}
    >
      <div className="subtitle-window">
        <div 
          className="subtitle-content"
          style={{
            transform: `scale(${subtitleSize / 100})`,
            transformOrigin: 'center center'
          }}
        >
          {currentCues.map((cue, index) => (
            <div key={index} className="subtitle-line">
              {cue.text.split('\n').map((line, lineIndex) => (
                <span key={lineIndex} className="subtitle-segment">
                  {line}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      
      {/* Visual feedback for control hints */}
      {isDraggingSubtitle && (
        <div className="subtitle-drag-hint">
          Dragging subtitle...
        </div>
      )}
    </div>
  );
}; 