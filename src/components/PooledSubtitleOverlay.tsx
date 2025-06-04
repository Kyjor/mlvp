import React, { useEffect } from 'react';
import { SubtitlePosition } from '../types';
import { useSubtitlePool } from '../contexts/SubtitlePoolContext';

interface PooledSubtitleOverlayProps {
  currentTime: number;
  primaryTrackId: string | null;
  secondaryTrackId: string | null;
  subtitlePosition: SubtitlePosition;
  subtitleSize: number;
  primarySubtitleOffset: number;
  secondarySubtitleOffset: number;
  isDraggingSubtitle: boolean;
  isCapturingAudio: boolean;
  subtitleRef: React.RefObject<HTMLDivElement>;
  onMouseDown: (e: React.MouseEvent) => void;
  onWheel: (e: React.WheelEvent) => void;
  onCaptureAudio?: (startTime: number, endTime: number) => void;
}

export const PooledSubtitleOverlay: React.FC<PooledSubtitleOverlayProps> = ({
  currentTime,
  primaryTrackId,
  secondaryTrackId,
  subtitlePosition,
  subtitleSize,
  primarySubtitleOffset,
  secondarySubtitleOffset,
  isDraggingSubtitle,
  isCapturingAudio,
  subtitleRef,
  onMouseDown,
  onWheel,
  onCaptureAudio,
}) => {
  const { getPoolContainer, updateVisibleSubtitles } = useSubtitlePool();

  // Update visible subtitles when time or tracks change
  useEffect(() => {
    updateVisibleSubtitles(
      currentTime, 
      primaryTrackId, 
      secondaryTrackId, 
      primarySubtitleOffset, 
      secondarySubtitleOffset, 
      onCaptureAudio
    );
  }, [currentTime, primaryTrackId, secondaryTrackId, primarySubtitleOffset, secondarySubtitleOffset, onCaptureAudio, updateVisibleSubtitles]);

  // Handle click events on the pool container
  const handleContainerClick = async (event: React.MouseEvent) => {
    if (event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();

      // Get all visible subtitle text
      const container = getPoolContainer();
      const visibleSubtitles = Array.from(container.querySelectorAll('.pooled-subtitle[style*="flex"]'));
      
      const subtitleText = visibleSubtitles.map(element => {
        const segment = element.querySelector('.subtitle-segment');
        if (segment) {
          // Create a temporary element to parse HTML and extract text content
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = segment.innerHTML;
          return tempDiv.textContent || tempDiv.innerText || "";
        }
        return "";
      }).join('\n');

      if (subtitleText) {
        try {
          await navigator.clipboard.writeText(subtitleText);
          console.log('Subtitle copied to clipboard:', subtitleText);
        } catch (err) {
          console.error('Failed to copy subtitle to clipboard:', err);
        }
      }
    } else {
      // If not a shift-click, then it's a drag attempt
      onMouseDown(event);
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${subtitlePosition.x}%`,
    bottom: `${subtitlePosition.y}%`,
    transform: 'translateX(-50%)',
    width: 'auto',
    maxWidth: '90%',
    pointerEvents: 'auto',
    cursor: isDraggingSubtitle ? 'grabbing' : 'grab',
    zIndex: 10,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
  };

  const windowStyle: React.CSSProperties = {
    transform: `scale(${subtitleSize / 100})`,
    transformOrigin: 'bottom center',
    transition: isDraggingSubtitle ? 'none' : 'transform 0.1s ease-out',
    textAlign: 'center',
    width: 'auto',
    display: 'inline-block',
    overflow: 'visible',
  };

  // Get the pool container
  const poolContainer = getPoolContainer();

  return (
    <div
      ref={subtitleRef}
      className="subtitle-overlay-container"
      style={overlayStyle}
      onMouseDown={onMouseDown}
      onWheel={onWheel}
      role="region"
      aria-live="polite"
      aria-label="Subtitles display area"
      title="Shift+Click to copy. Ctrl+Drag to move. Ctrl+Scroll or Drag Up/Right to resize."
    >
      {isDraggingSubtitle && (
        <div className="subtitle-drag-hint">
          {(subtitleRef.current?.style.cursor === 'grabbing')
            ? "Moving Subtitles"
            : "Resizing Subtitles"}
        </div>
      )}
      
      <div 
        className="subtitle-window"
        style={windowStyle} 
        onClick={handleContainerClick}
        role="button"
        tabIndex={0}
        aria-label="Subtitle content area"
      >
        <div 
          className="subtitle-content"
          ref={(element) => {
            if (element && poolContainer) {
              // Ensure the pool container is attached
              if (!element.contains(poolContainer)) {
                element.appendChild(poolContainer);
              }
            }
          }}
        />
      </div>
    </div>
  );
}; 