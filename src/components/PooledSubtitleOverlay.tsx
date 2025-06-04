import React, { useEffect, useState } from 'react';
import { SubtitlePosition } from '../types';
import { useSubtitlePool } from '../contexts/SubtitlePoolContext';
import { filterParentheticalText } from '../utils/subtitleParser';
import { DictionaryModal } from './DictionaryModal';
import { lookupKanjiBeginning } from '../utils/jmdict';

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
  blurSecondary: boolean;
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
  blurSecondary,
  subtitleRef,
  onMouseDown,
  onWheel,
  onCaptureAudio,
}) => {
  const { getPoolContainer, updateVisibleSubtitles } = useSubtitlePool();

  // Dictionary lookup state
  const [selectedText, setSelectedText] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [secondarySourceText, setSecondarySourceText] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [lookupResults, setLookupResults] = useState<any[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  // Update visible subtitles when time or tracks change
  useEffect(() => {
    updateVisibleSubtitles(
      currentTime, 
      primaryTrackId, 
      secondaryTrackId, 
      primarySubtitleOffset, 
      secondarySubtitleOffset, 
      onCaptureAudio,
      blurSecondary
    );
  }, [currentTime, primaryTrackId, secondaryTrackId, primarySubtitleOffset, secondarySubtitleOffset, onCaptureAudio, blurSecondary, updateVisibleSubtitles]);

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
    setSourceText('');
    setSecondarySourceText('');
  };

  // Helper to select word at click position
  const selectWordAtPosition = (event: React.MouseEvent): string | null => {
    const target = event.target as HTMLElement;
    if (target.nodeType === Node.TEXT_NODE || target.textContent) {
      const range = document.createRange();
      const selection = window.getSelection();
      
      // If clicked on a text node or element with text
      if (target.nodeType === Node.TEXT_NODE) {
        range.selectNodeContents(target);
      } else if (target.textContent) {
        range.selectNodeContents(target);
      }
      
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      const selectedText = selection?.toString().trim() || '';
      return selectedText;
    }
    return null;
  };

  // Helper to get the text content of the subtitle that contains the selection
  const getSourceText = (selection: Selection): string => {
    const anchorNode = selection.anchorNode;
    if (!anchorNode) return '';
    
    // Find the closest subtitle element
    let element = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode as Element;
    while (element && !element.classList.contains('pooled-subtitle')) {
      element = element.parentElement;
    }
    
    if (element) {
      // Get the text content of the subtitle segment
      const segment = element.querySelector('.subtitle-segment');
      if (segment) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = segment.innerHTML;
        return tempDiv.textContent || tempDiv.innerText || '';
      }
    }
    
    return '';
  };

  // Helper to get secondary subtitle text (if visible at the same time)
  const getSecondarySourceText = (): string => {
    if (!subtitleRef.current) return '';
    
    // Find all visible secondary subtitles
    const secondarySubtitles = subtitleRef.current.querySelectorAll('.pooled-subtitle.secondary-subtitle');
    
    // Get text from the first visible secondary subtitle
    for (const subtitle of secondarySubtitles) {
      const element = subtitle as HTMLElement;
      if (element.style.display === 'flex') {
        const segment = element.querySelector('.subtitle-segment');
        if (segment) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = segment.innerHTML;
          return tempDiv.textContent || tempDiv.innerText || '';
        }
      }
    }
    
    return '';
  };

  // Handle mouse up for dictionary lookup
  const handleMouseUp = async (event: React.MouseEvent) => {
    if (event.shiftKey) {
      // Shift+Click: dictionary lookup for selected text
      let selection = window.getSelection();
      let selectedText = selection?.toString().trim() || '';
      
      // If no text is selected, try to auto-select word at click position
      if (!selectedText) {
        selectedText = selectWordAtPosition(event) || '';
        selection = window.getSelection(); // Get updated selection
      }
      
      if (selectedText && selection) {
        const anchorNode = selection.anchorNode;
        const isInside = nodeIsOrInside(anchorNode, subtitleRef.current);
        
        if (isInside) {
          const sourceTextContent = getSourceText(selection);
          const secondaryTextContent = getSecondarySourceText();
          setSelectedText(selectedText);
          setSourceText(sourceTextContent);
          setSecondarySourceText(secondaryTextContent);
          await handleLookup(selectedText);
          return;
        }
      }
    }
  };

  // Handle click events on the pool container (for copy only)
  const handleContainerClick = async (event: React.MouseEvent) => {
    if (event.ctrlKey && event.detail === 2) { // Ctrl+Double Click
      event.preventDefault();
      event.stopPropagation();

      // Find the specific subtitle element that was clicked
      const target = event.target as HTMLElement;
      const clickedSubtitle = target.closest('.pooled-subtitle') as HTMLElement;
      
      if (clickedSubtitle && clickedSubtitle.style.display === 'flex') {
        const segment = clickedSubtitle.querySelector('.subtitle-segment');
        if (segment) {
          // Create a temporary element to parse HTML and extract text content
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
      }
    } else if (!event.ctrlKey && !event.altKey && !event.shiftKey) {
      // Only trigger drag if no modifier keys are pressed
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
    <>
      <div
        ref={subtitleRef}
        className="subtitle-overlay-container"
        style={overlayStyle}
        onMouseDown={onMouseDown}
        onWheel={onWheel}
        role="region"
        aria-live="polite"
        aria-label="Subtitles display area"
        title="Ctrl+Double Click to copy. Shift+Click to look up. Ctrl+Drag to move. Alt+Drag Up/Right to resize."
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
          onMouseUp={handleMouseUp}
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
      <DictionaryModal
        open={modalOpen}
        onClose={handleModalClose}
        word={selectedText}
        results={lookupResults}
        loading={lookupLoading}
        error={lookupError}
        sourceText={sourceText}
        secondarySourceText={secondarySourceText}
      />
    </>
  );
}; 