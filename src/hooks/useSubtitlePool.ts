import { useRef, useCallback, useEffect } from 'react';
import { SubtitleCue } from '../types';

interface SubtitleElement {
  id: string;
  trackId: string;
  cue: SubtitleCue;
  element: HTMLDivElement;
  isVisible: boolean;
}

export const useSubtitlePool = () => {
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
      
      // Assemble elements
      subtitleLine.appendChild(subtitleSegment);
      cueContainer.appendChild(subtitleLine);
      
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
  }, [getPoolContainer]);

  // Update visible subtitles based on current time and active track
  const updateVisibleSubtitles = useCallback((currentTime: number, activeTrackId: string | null, subtitleOffset: number = 0, onCaptureAudio?: (startTime: number, endTime: number) => void) => {
    const pool = poolRef.current;
    const adjustedTime = currentTime - subtitleOffset;
    
    pool.forEach((subtitleElement) => {
      const { cue, element, trackId } = subtitleElement;
      const shouldBeVisible = trackId === activeTrackId && 
                             adjustedTime >= cue.startTime && 
                             adjustedTime <= cue.endTime;
      
      if (shouldBeVisible && !subtitleElement.isVisible) {
        // Show subtitle
        element.style.display = 'flex';
        subtitleElement.isVisible = true;
      
      } else if (!shouldBeVisible && subtitleElement.isVisible) {
        // Hide subtitle
        element.style.display = 'none';
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

  return {
    createSubtitleElements,
    updateVisibleSubtitles,
    getPoolContainer,
    clearTrackSubtitles,
    clearAllSubtitles
  };
}; 