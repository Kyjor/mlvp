import React, { useEffect, useState } from 'react';
import { SubtitleCue, SubtitlePosition } from '../types';
import { filterParentheticalText, colorizeJapaneseText } from '../utils/subtitleParser';
import { DictionaryModal } from './DictionaryModal';
import { lookupKanjiBeginning } from '../utils/jmdict';

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
  const [colorizedCues, setColorizedCues] = useState<{ cue: SubtitleCue; colorizedText: string }[]>([]);

  // Dictionary lookup state
  const [selectedText, setSelectedText] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [lookupResults, setLookupResults] = useState<any[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  // Process cues for Japanese colorization
  useEffect(() => {
    const processCurrentCues = async () => {
      const processed = await Promise.all(
        currentCues.map(async (cue) => {
          const filteredText = filterParentheticalText(cue.text);
          const colorizedText = await colorizeJapaneseText(filteredText);
          return { cue, colorizedText };
        })
      );
      setColorizedCues(processed);
    };
    processCurrentCues();
  }, [currentCues]);

  // Helper to check if a node is or is inside a container
  function nodeIsOrInside(node: Node | null, container: HTMLElement | null): boolean {
    if (!node || !container) return false;
    if (node === container) return true;
    return nodeIsOrInside((node as any).parentNode, container);
  }

  // Lookup handler
  const handleLookup = async (text: string) => {
    setModalOpen(true);
    setLookupLoading(true);
    setLookupError('');
    setLookupResults([]);
    try {
      const results = await lookupKanjiBeginning(text, 5);
      setLookupResults(results);
    } catch (e) {
      setLookupError('Lookup failed');
    }
    setLookupLoading(false);
  };

  // Close modal handler
  const handleModalClose = () => {
    setModalOpen(false);
    setLookupResults([]);
    setLookupError('');
    setLookupLoading(false);
    setSelectedText('');
  };

  const handleSubtitleClick = async (event: React.MouseEvent) => {
    if (event.shiftKey) {
      // Shift+Click: dictionary lookup for selected text
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        const anchorNode = selection.anchorNode;
        if (nodeIsOrInside(anchorNode, subtitleRef.current)) {
          const text = selection.toString().trim();
          setSelectedText(text);
          handleLookup(text);
          return;
        }
      }
    }
    if (event.ctrlKey && event.detail === 2) { // Ctrl+Double Click
      event.preventDefault();
      event.stopPropagation();
      const target = event.target as HTMLElement;
      const clickedLine = target.closest('.subtitle-line-container') as HTMLElement;
      if (clickedLine) {
        const segment = clickedLine.querySelector('.subtitle-segment');
        if (segment) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = segment.innerHTML;
          const subtitleText = tempDiv.textContent || tempDiv.innerText || "";
          if (subtitleText) {
            try {
              const filteredText = filterParentheticalText(subtitleText);
              await navigator.clipboard.writeText(filteredText);
              console.log('Subtitle copied to clipboard:', filteredText);
            } catch (err) {
              console.error('Failed to copy subtitle to clipboard:', err);
            }
          }
        }
      } else {
        const subtitleTextToCopy = currentCues.map(cue => {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = cue.text; 
          return tempDiv.textContent || tempDiv.innerText || "";
        }).join('\n');
        if (subtitleTextToCopy) {
          try {
            const filteredText = filterParentheticalText(subtitleTextToCopy);
            await navigator.clipboard.writeText(filteredText);
            console.log('Subtitle copied to clipboard:', filteredText);
          } catch (err) {
            console.error('Failed to copy subtitle to clipboard:', err);
          }
        }
      }
    } else if (!event.ctrlKey && !event.altKey && !event.shiftKey) {
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

  if (colorizedCues.length === 0 && !isDraggingSubtitle) {
    return null;
  }

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

  return (
    <>
      <div
        ref={subtitleRef}
        className="subtitle-overlay-container"
        style={overlayStyle}
        onMouseDown={onMouseDown}
        onWheel={onWheel}
        onClick={handleSubtitleClick}
        role="region"
        aria-live="polite"
        aria-label="Subtitles display area"
        title={colorizedCues.length > 0 ? "Ctrl+Double Click to copy. Shift+Click to look up. Ctrl+Drag to move. Alt+Drag Up/Right to resize." : "Subtitle controls: Ctrl+Drag to move. Alt+Drag Up/Right to resize."}
      >
        {isDraggingSubtitle && (
          <div className="subtitle-drag-hint">
            { (subtitleRef.current?.style.cursor === 'grabbing')
              ? "Moving Subtitles"
              : "Resizing Subtitles"}
          </div>
        )}
        <div 
          className="subtitle-window"
          style={windowStyle} 
          role="button"
          tabIndex={0}
          aria-label={colorizedCues.length > 0 ? `Current subtitle: ${colorizedCues.map(c => c.cue.text).join(' ')}` : "No active subtitle"}
        >
          <div className="subtitle-content">
            {colorizedCues.map((item, index) => (
              <div key={index} className="subtitle-line-container">
                <span className="subtitle-line">
                  <span className="subtitle-segment" dangerouslySetInnerHTML={{ __html: item.colorizedText }} />
                </span>
                {onCaptureAudio && (
                  <button 
                    className={`subtitle-capture-btn ${isCapturingAudio ? 'capturing' : ''}`}
                    onClick={(e) => handleCaptureClick(e, item.cue)}
                    disabled={isCapturingAudio}
                    title={`Capture audio for this line (${item.cue.startTime.toFixed(1)}s - ${item.cue.endTime.toFixed(1)}s ± 2s)`}
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
      <DictionaryModal
        open={modalOpen}
        onClose={handleModalClose}
        word={selectedText}
        results={lookupResults}
        loading={lookupLoading}
        error={lookupError}
      />
    </>
  );
};