import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react';
import { SubtitleCue } from '../types';
import { filterParentheticalText, colorizeJapaneseText } from '../utils/subtitleParser';

interface SubtitleElement {
  id: string;
  trackId: string;
  cue: SubtitleCue;
  element: HTMLDivElement;
  isVisible: boolean;
}

interface SubtitlePoolContextType {
  createSubtitleElements: (trackId: string, cues: SubtitleCue[]) => Promise<void>;
  updateVisibleSubtitles: (
    currentTime: number, 
    primaryTrackId: string | null, 
    secondaryTrackId: string | null,
    primaryOffset?: number, 
    secondaryOffset?: number,
    onCaptureAudio?: (startTime: number, endTime: number) => void,
    blurSecondary?: boolean
  ) => void;
  getPoolContainer: () => HTMLDivElement;
  clearTrackSubtitles: (trackId: string) => void;
  clearAllSubtitles: () => void;
}

const SubtitlePoolContext = createContext<SubtitlePoolContextType | null>(null);

export const useSubtitlePool = () => {
  const context = useContext(SubtitlePoolContext);
  if (!context) {
    throw new Error('useSubtitlePool must be used within a SubtitlePoolProvider');
  }
  return context;
};

export const SubtitlePoolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const poolRef = useRef<Map<string, SubtitleElement>>(new Map());
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Get or create container
  const getPoolContainer = useCallback(() => {
    if (!containerRef.current) {
      const container = document.createElement('div');
      container.className = 'subtitle-pool-container';
      containerRef.current = container;
    }
    return containerRef.current;
  }, []);

  // Create subtitle elements for all cues
  const createSubtitleElements = useCallback(async (trackId: string, cues: SubtitleCue[]) => {
    const pool = poolRef.current;
    const container = getPoolContainer();
    
    console.log(`Creating ${cues.length} subtitle elements for track ${trackId}`);
    
    // Remove existing elements for this track
    pool.forEach((element, id) => {
      if (element.trackId === trackId) {
        element.element.remove();
        pool.delete(id);
      }
    });

    // Create new elements for all cues
    for (let index = 0; index < cues.length; index++) {
      const cue = cues[index];
      const elementId = `${trackId}-cue-${index}`;
      
      // Create container for this cue
      const cueContainer = document.createElement('div');
      cueContainer.className = 'subtitle-line-container pooled-subtitle';
      cueContainer.style.display = 'none'; // Hidden by default
      
      // Create subtitle line
      const subtitleLine = document.createElement('span');
      subtitleLine.className = 'subtitle-line';
      
      // Create subtitle segment with content
      const subtitleSegment = document.createElement('span');
      subtitleSegment.className = 'subtitle-segment';
      
      // Process text: filter parenthetical content and colorize Japanese
      const filteredText = filterParentheticalText(cue.text);
      const colorizedText = await colorizeJapaneseText(filteredText);
      subtitleSegment.innerHTML = colorizedText;
      
      // Create capture button
      const captureBtn = document.createElement('button');
      captureBtn.className = 'subtitle-capture-btn';
      captureBtn.innerHTML = '🎤';
      captureBtn.title = `Capture audio for this line (${cue.startTime.toFixed(1)}s - ${cue.endTime.toFixed(1)}s ± 2s)`;
      captureBtn.setAttribute('aria-label', 'Capture audio for this subtitle line');
      
      // Assemble elements
      subtitleLine.appendChild(subtitleSegment);
      cueContainer.appendChild(subtitleLine);
      cueContainer.appendChild(captureBtn);
      
      // Add to container
      container.appendChild(cueContainer);
      
      // Store in pool
      pool.set(elementId, {
        id: elementId,
        trackId,
        cue,
        element: cueContainer,
        isVisible: false
      });
    }
    
    console.log(`Pool now has ${pool.size} total elements, container has ${container.children.length} children`);
  }, [getPoolContainer]);

  // Update visible subtitles based on current time and active tracks
  const updateVisibleSubtitles = useCallback((
    currentTime: number, 
    primaryTrackId: string | null, 
    secondaryTrackId: string | null,
    primaryOffset: number = 0, 
    secondaryOffset: number = 0,
    onCaptureAudio?: (startTime: number, endTime: number) => void,
    blurSecondary?: boolean
  ) => {
    const pool = poolRef.current;
    const primaryAdjustedTime = currentTime - primaryOffset;
    const secondaryAdjustedTime = currentTime - secondaryOffset;
    
    pool.forEach((subtitleElement) => {
      const { cue, element, trackId: elementTrackId } = subtitleElement;

      const isDesignatedPrimary = (elementTrackId === primaryTrackId);
      const isDesignatedSecondary = (elementTrackId === secondaryTrackId);

      const isCueActiveForPrimary = isDesignatedPrimary &&
                                  primaryAdjustedTime >= cue.startTime && 
                                  primaryAdjustedTime <= cue.endTime;

      const isCueActiveForSecondary = isDesignatedSecondary &&
                                    secondaryAdjustedTime >= cue.startTime && 
                                    secondaryAdjustedTime <= cue.endTime;
      
      const shouldDisplayAsPrimary = isCueActiveForPrimary;
      const shouldDisplayAsSecondary = isCueActiveForSecondary && !shouldDisplayAsPrimary;

      const shouldBeVisible = shouldDisplayAsPrimary || shouldDisplayAsSecondary;
      
      if (shouldBeVisible) {
        if (!subtitleElement.isVisible) {
          // Make visible and set initial classes
          element.style.display = 'flex';
          subtitleElement.isVisible = true;
          element.classList.toggle('primary-subtitle', shouldDisplayAsPrimary);
          element.classList.toggle('secondary-subtitle', shouldDisplayAsSecondary);
          element.classList.toggle('blur-secondary', shouldDisplayAsSecondary && !!blurSecondary);
        } else {
          // Already visible, update classes if needed
          const needsPrimaryUpdate = element.classList.contains('primary-subtitle') !== shouldDisplayAsPrimary;
          const needsSecondaryUpdate = element.classList.contains('secondary-subtitle') !== shouldDisplayAsSecondary;
          
          if (needsPrimaryUpdate) {
            element.classList.toggle('primary-subtitle', shouldDisplayAsPrimary);
          }
          if (needsSecondaryUpdate) {
            element.classList.toggle('secondary-subtitle', shouldDisplayAsSecondary);
          }
          
          // Always update blur for all visible subtitles
          if (shouldDisplayAsSecondary) {
            element.classList.toggle('blur-secondary', !!blurSecondary);
          } else {
            element.classList.remove('blur-secondary');
          }
        }
        
        // Update capture button handler (can be done regardless of new/existing visibility if visible)
        const captureBtn = element.querySelector('.subtitle-capture-btn') as HTMLButtonElement;
        if (captureBtn && onCaptureAudio) {
          captureBtn.onclick = (e) => {
            // Only prevent/stop if the capture button itself was clicked
            if (e.target === captureBtn) {
              e.preventDefault();
              e.stopPropagation();
              onCaptureAudio(cue.startTime, cue.endTime);
            }
          };
        }
      } else { // Should not be visible
        if (subtitleElement.isVisible) {
          element.style.display = 'none';
          element.classList.remove('primary-subtitle', 'secondary-subtitle', 'blur-secondary');
          subtitleElement.isVisible = false;
        }
      }
    });
  }, []);

  // Clear all subtitles for a track
  const clearTrackSubtitles = useCallback((trackId: string) => {
    const pool = poolRef.current;
    pool.forEach((element, id) => {
      if (element.trackId === trackId) {
        element.element.remove();
        pool.delete(id);
      }
    });
  }, []);

  // Clear all subtitles
  const clearAllSubtitles = useCallback(() => {
    const pool = poolRef.current;
    pool.forEach((element) => {
      element.element.remove();
    });
    pool.clear();
    
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllSubtitles();
    };
  }, [clearAllSubtitles]);

  const value = {
    createSubtitleElements,
    updateVisibleSubtitles,
    getPoolContainer,
    clearTrackSubtitles,
    clearAllSubtitles
  };

  return (
    <SubtitlePoolContext.Provider value={value}>
      {children}
    </SubtitlePoolContext.Provider>
  );
}; 