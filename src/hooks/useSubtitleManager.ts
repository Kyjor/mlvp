import { useState, useEffect, useCallback } from 'react';
import { SubtitleTrack, SubtitleCue, CachedSubtitleTrack } from '../types';
import { convertAssToVtt, convertSrtToVtt } from '../utils/subtitleConverter';
import { parseVttContent, getActiveCues } from '../utils/subtitleParser';
import { useSubtitlePool } from '../contexts/SubtitlePoolContext';

interface UseSubtitleManagerProps {
  initialTracks?: CachedSubtitleTrack[];
  initialActiveId?: string | null;
  initialOffset?: number;
  initialSecondaryId?: string | null;
  initialSecondaryOffset?: number;
}

export const useSubtitleManager = (currentTime: number, props?: UseSubtitleManagerProps) => {
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>(() => {
    if (props?.initialTracks) {
      return props.initialTracks.map(cachedTrack => ({
        id: cachedTrack.id,
        label: cachedTrack.label,
        src: cachedTrack.src,
        default: false,
        language: '',
        cues: [],
      }));
    }
    return [];
  });

  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(props?.initialActiveId || null);
  const [secondarySubtitle, setSecondarySubtitle] = useState<string | null>(props?.initialSecondaryId || null);
  const [subtitleOffset, setSubtitleOffset] = useState<number>(props?.initialOffset || 0);
  const [secondarySubtitleOffset, setSecondarySubtitleOffset] = useState<number>(props?.initialSecondaryOffset || 0);
  
  const [subtitleData, setSubtitleData] = useState<Map<string, SubtitleCue[]>>(() => {
    const initialMap = new Map<string, SubtitleCue[]>();
    if (props?.initialTracks) {
      props.initialTracks.forEach(cachedTrack => {
        try {
          if (cachedTrack.src.startsWith('data:text/vtt;charset=utf-8,')) {
            const vttContent = decodeURIComponent(cachedTrack.src.split(',')[1]);
            const cues = parseVttContent(vttContent);
            initialMap.set(cachedTrack.id, cues);
          } else {
            console.warn("Cached track src is not a VTT data URL:", cachedTrack.label);
          }
        } catch (e) {
          console.error("Error parsing VTT from cached src for track:", cachedTrack.label, e);
        }
      });
    }
    return initialMap;
  });
  const [currentCues, setCurrentCues] = useState<SubtitleCue[]>([]);
  const [currentSecondaryCues, setCurrentSecondaryCues] = useState<SubtitleCue[]>([]);

  const { createSubtitleElements, clearTrackSubtitles, clearAllSubtitles } = useSubtitlePool();

  // Create pool elements for initial cached subtitles
  useEffect(() => {
    if (props?.initialTracks) {
      props.initialTracks.forEach(async (cachedTrack) => {
        try {
          if (cachedTrack.src.startsWith('data:text/vtt;charset=utf-8,')) {
            const vttContent = decodeURIComponent(cachedTrack.src.split(',')[1]);
            const cues = parseVttContent(vttContent);
            await createSubtitleElements(cachedTrack.id, cues);
          }
        } catch (e) {
          console.error("Error creating pool elements for cached track:", cachedTrack.label, e);
        }
      });
    }
  }, [props?.initialTracks, createSubtitleElements]);

  useEffect(() => {
    // Update primary subtitle cues
    if (activeSubtitle && subtitleData.has(activeSubtitle)) {
      const cues = subtitleData.get(activeSubtitle)!;
      const newActiveCues = getActiveCues(cues, currentTime - subtitleOffset);
      setCurrentCues(newActiveCues);
    } else {
      setCurrentCues([]);
    }

    // Update secondary subtitle cues
    if (secondarySubtitle && subtitleData.has(secondarySubtitle)) {
      const cues = subtitleData.get(secondarySubtitle)!;
      const newSecondaryCues = getActiveCues(cues, currentTime - secondarySubtitleOffset);
      setCurrentSecondaryCues(newSecondaryCues);
    } else {
      setCurrentSecondaryCues([]);
    }
  }, [activeSubtitle, secondarySubtitle, subtitleData, subtitleOffset, secondarySubtitleOffset]);

  const addSubtitleFiles = useCallback(async (files: File[]) => {
    const newTracks: SubtitleTrack[] = [];
    const newData = new Map(subtitleData);

    for (const file of files) {
      const trackId = `subtitle-${Date.now()}-${Math.random()}`;
      let vttContent = '';

      try {
        const content = await file.text();
        const extension = file.name.split('.').pop()?.toLowerCase() || '';

        switch (extension) {
          case 'vtt':
            vttContent = content;
            break;
          case 'srt':
            vttContent = convertSrtToVtt(content);
            break;
          case 'ass':
          case 'ssa':
            vttContent = convertAssToVtt(content);
            break;
          default:
            console.warn(`Unsupported subtitle format: ${extension}`);
            continue;
        }

        const cues = parseVttContent(vttContent);
        const track: SubtitleTrack = {
          id: trackId,
          label: file.name,
          src: `data:text/vtt;charset=utf-8,${encodeURIComponent(vttContent)}`,
          default: newTracks.length === 0 && subtitleTracks.length === 0,
          language: '',
          cues: [],
        };

        newTracks.push(track);
        newData.set(trackId, cues);
        
        // Create pool elements for this track
        await createSubtitleElements(trackId, cues);

      } catch (error) {
        console.error(`Error processing subtitle file ${file.name}:`, error);
      }
    }

    if (newTracks.length > 0) {
      setSubtitleTracks(prev => [...prev, ...newTracks]);
      setSubtitleData(newData);

      // Set first track as active if no active track exists
      if (!activeSubtitle && newTracks.length > 0) {
        setActiveSubtitle(newTracks[0].id);
      }
    }
  }, [subtitleData, subtitleTracks.length, activeSubtitle, createSubtitleElements]);

  const removeSubtitleTrack = useCallback((trackId: string) => {
    setSubtitleTracks(prev => prev.filter(track => track.id !== trackId));
    setSubtitleData(prev => {
      const newMap = new Map(prev);
      newMap.delete(trackId);
      return newMap;
    });
    
    // Clear pool elements for this track
    clearTrackSubtitles(trackId);

    if (activeSubtitle === trackId) {
      setActiveSubtitle(null);
    }
    if (secondarySubtitle === trackId) {
      setSecondarySubtitle(null);
    }
  }, [activeSubtitle, secondarySubtitle, clearTrackSubtitles]);

  const toggleActiveSubtitle = useCallback((trackId: string | null) => {
    setActiveSubtitle(trackId);
  }, []);

  const toggleSecondarySubtitle = useCallback((trackId: string | null) => {
    setSecondarySubtitle(trackId);
  }, []);

  const resetSubtitleState = useCallback(() => {
    setSubtitleTracks([]);
    setSubtitleData(new Map());
    setActiveSubtitle(null);
    setSecondarySubtitle(null);
    setSubtitleOffset(0);
    setSecondarySubtitleOffset(0);
    setCurrentCues([]);
    setCurrentSecondaryCues([]);
    
    // Clear all pool elements
    clearAllSubtitles();
  }, [clearAllSubtitles]);

  const updateSubtitleOffset = useCallback((newOffset: number) => {
    setSubtitleOffset(newOffset);
  }, []);

  const updateSecondarySubtitleOffset = useCallback((newOffset: number) => {
    setSecondarySubtitleOffset(newOffset);
  }, []);

  return {
    subtitleTracks,
    activeSubtitle,
    secondarySubtitle,
    currentCues,
    currentSecondaryCues,
    subtitleOffset,
    secondarySubtitleOffset,
    subtitleData,
    addSubtitleFiles,
    removeSubtitleTrack,
    toggleActiveSubtitle,
    toggleSecondarySubtitle,
    updateSubtitleOffset,
    updateSecondarySubtitleOffset,
    resetSubtitleState,
    setSubtitleTracks,
    setActiveSubtitle,
    setSecondarySubtitle,
    setSubtitleData,
    setCurrentCues,
    setCurrentSecondaryCues,
    setSubtitleOffset,
    setSecondarySubtitleOffset
  };
}; 