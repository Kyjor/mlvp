import React from 'react';
import { SubtitleCue, SubtitlePosition } from '../types';

interface SubtitleOverlayProps {
  currentCues: SubtitleCue[];
  subtitlePosition: SubtitlePosition;
  subtitleSize: number;
  isDraggingSubtitle: boolean;
  isCapturingAudio: boolean;
  subtitleRef: React.RefObject<HTMLDivElement>;
  onMouseDown: (e: React.MouseEvent) => void;
  onWheel: (e: React.WheelEvent) => void;
  onCaptureAudio?: (startTime: number, endTime: number) => void;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  currentCues,
  subtitlePosition,
  subtitleSize,
  isDraggingSubtitle,
  isCapturingAudio,
  subtitleRef,
  onMouseDown,
  onWheel,
  onCaptureAudio,
}) => {

  const handleSubtitleClick = async (event: React.MouseEvent) => {
    if (event.shiftKey) {
      event.preventDefault(); // Prevent any default shift+click behavior
      event.stopPropagation(); // Stop event from bubbling to onMouseDown if it's on the same element

      const subtitleTextToCopy = currentCues.map(cue => {
        // Create a temporary element to parse HTML and extract text content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cue.text; 
        return tempDiv.textContent || tempDiv.innerText || "";
      }).join('\n');

      if (subtitleTextToCopy) {
        try {
          await navigator.clipboard.writeText(subtitleTextToCopy);
          console.log('Subtitle copied to clipboard:', subtitleTextToCopy);
          // Consider adding a brief visual notification here
        } catch (err) {
          console.error('Failed to copy subtitle to clipboard:', err);
        }
      }
    } else {
      // If not a shift-click, then it's a drag attempt, so call the original onMouseDown
      onMouseDown(event);
    }
  };

  const handleCaptureClick = (event: React.MouseEvent, cue: SubtitleCue) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (onCaptureAudio && !isCapturingAudio) {
      onCaptureAudio(cue.startTime, cue.endTime);
    }
  };

  if (currentCues.length === 0 && !isDraggingSubtitle) { // Keep it visible if dragging, even if cues disappear
    return null;
  }

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${subtitlePosition.x}%`,
    bottom: `${subtitlePosition.y}%`, // Using bottom for positioning from the VTT standard (line property)
    transform: 'translateX(-50%)', // Center horizontally
    width: 'auto', // Fit content
    maxWidth: '90%', // Prevent from being too wide
    pointerEvents: 'auto', // Allow clicks and drags
    cursor: isDraggingSubtitle ? 'grabbing' : 'grab',
    zIndex: 10,
    display: 'flex', // Use flex to center the content within if needed
    justifyContent: 'center',
    alignItems: 'flex-end', // Align to bottom, typical for subtitles
  };

  const windowStyle: React.CSSProperties = {
    transform: `scale(${subtitleSize / 100})`,
    transformOrigin: 'bottom center', // Scale from bottom center
    transition: isDraggingSubtitle ? 'none' : 'transform 0.1s ease-out',
    textAlign: 'center',
    width: 'auto', // Allow the window to fit its content
    display: 'inline-block', // Important for width:auto and proper scaling of background
    overflow: 'visible', // Ensure scaled content isn't clipped by this div
  };
  
  // The main div captures mouse down for dragging and wheel for precise resizing
  // The inner div captures shift+click for copying
  return (
    <div
      ref={subtitleRef}
      className="subtitle-overlay-container"
      style={overlayStyle}
      onMouseDown={onMouseDown} // For dragging the entire overlay
      onWheel={onWheel} // For resizing via Ctrl+Scroll on the overlay
      role="region" // More appropriate role for a region displaying subtitles
      aria-live="polite"
      aria-label="Subtitles display area"
      title={currentCues.length > 0 ? "Shift+Click to copy. Ctrl+Drag to move. Ctrl+Scroll or Drag Up/Right to resize." : "Subtitle controls: Ctrl+Drag to move. Ctrl+Scroll or Drag Up/Right to resize."}
    >
      {isDraggingSubtitle && (
        <div className="subtitle-drag-hint">
          {/* Hint can be more dynamic based on ctrlKey if needed */}
          { (subtitleRef.current?.style.cursor === 'grabbing') /* A bit of a hack, better to pass drag mode */
            ? "Moving Subtitles"
            : "Resizing Subtitles"}
        </div>
      )}
      {/* This inner div is specifically for the subtitle text and its click handler */}
      <div 
        className="subtitle-window"
        style={windowStyle} 
        onClick={handleSubtitleClick} // Shift+Click for copying is on the text window itself
        role="button" // Semantically, clicking it does something
        tabIndex={0} // Make it focusable for accessibility
        aria-label={currentCues.length > 0 ? `Current subtitle: ${currentCues.map(c => c.text).join(' ')}` : "No active subtitle"}
      >
        <div className="subtitle-content">
          {currentCues.map((cue, index) => (
            <div key={index} className="subtitle-line-container">
              <span className="subtitle-line">
                <span className="subtitle-segment" dangerouslySetInnerHTML={{ __html: cue.text }} />
              </span>
              {onCaptureAudio && (
                <button 
                  className={`subtitle-capture-btn ${isCapturingAudio ? 'capturing' : ''}`}
                  onClick={(e) => handleCaptureClick(e, cue)}
                  disabled={isCapturingAudio}
                  title={`Capture audio for this line (${cue.startTime.toFixed(1)}s - ${cue.endTime.toFixed(1)}s ± 2s)`}
                  aria-label="Capture audio for this subtitle line"
                >
                  {isCapturingAudio ? '⏺️' : '🎤'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 