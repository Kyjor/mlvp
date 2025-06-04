import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react';
import { SubtitleCue } from '../types';

interface SubtitleElement {
  id: string;
  trackId: string;
  cue: SubtitleCue;
  element: HTMLDivElement;
  isVisible: boolean;
}

interface SubtitlePoolContextType {
  createSubtitleElements: (trackId: string, cues: SubtitleCue[]) => void;
  updateVisibleSubtitles: (
    currentTime: number, 
    primaryTrackId: string | null, 
    secondaryTrackId: string | null,
    primaryOffset?: number, 
    secondaryOffset?: number,
    onCaptureAudio?: (startTime: number, endTime: number) => void
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
  const createSubtitleElements = useCallback((trackId: string, cues: SubtitleCue[]) => {
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
    cues.forEach((cue, index) => {
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
      subtitleSegment.innerHTML = cue.text;
      
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
    });
    
    console.log(`Pool now has ${pool.size} total elements, container has ${container.children.length} children`);
  }, [getPoolContainer]);

  // Update visible subtitles based on current time and active tracks
  const updateVisibleSubtitles = useCallback((
    currentTime: number, 
    primaryTrackId: string | null, 
    secondaryTrackId: string | null,
    primaryOffset: number = 0, 
    secondaryOffset: number = 0,
    onCaptureAudio?: (startTime: number, endTime: number) => void
  ) => {
    const pool = poolRef.current;
    const primaryAdjustedTime = currentTime - primaryOffset;
    const secondaryAdjustedTime = currentTime - secondaryOffset;
    
    pool.forEach((subtitleElement) => {
      const { cue, element, trackId } = subtitleElement;
      
      let shouldBeVisible = false;
      let isPrimary = false;
      
      // Check if it should be visible as primary track
      if (trackId === primaryTrackId && 
          primaryAdjustedTime >= cue.startTime && 
          primaryAdjustedTime <= cue.endTime) {
        shouldBeVisible = true;
        isPrimary = true;
      }
      
      // Check if it should be visible as secondary track
      if (trackId === secondaryTrackId && 
          secondaryAdjustedTime >= cue.startTime && 
          secondaryAdjustedTime <= cue.endTime) {
        shouldBeVisible = true;
        isPrimary = false;
      }
      
      if (shouldBeVisible && !subtitleElement.isVisible) {
        // Show subtitle
        element.style.display = 'flex';
        element.classList.toggle('primary-subtitle', isPrimary);
        element.classList.toggle('secondary-subtitle', !isPrimary);
        subtitleElement.isVisible = true;
        
        // Update capture button handler
        const captureBtn = element.querySelector('.subtitle-capture-btn') as HTMLButtonElement;
        if (captureBtn && onCaptureAudio) {
          captureBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            onCaptureAudio(cue.startTime, cue.endTime);
          };
        }
      } else if (!shouldBeVisible && subtitleElement.isVisible) {
        // Hide subtitle
        element.style.display = 'none';
        element.classList.remove('primary-subtitle', 'secondary-subtitle');
        subtitleElement.isVisible = false;
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