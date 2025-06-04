import { useState, useEffect, useCallback } from 'react';
import { SubtitleTrack, SubtitleCue, CachedSubtitleTrack } from '../types';
import { convertAssToVtt, convertSrtToVtt } from '../utils/subtitleConverter';
import { parseVttContent, getActiveCues } from '../utils/subtitleParser';

interface UseSubtitleManagerProps {
  initialTracks?: CachedSubtitleTrack[];
  initialActiveId?: string | null;
  initialOffset?: number;
}

export const useSubtitleManager = (currentTime: number, props?: UseSubtitleManagerProps) => {
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>(() => {
    if (props?.initialTracks) {
      return props.initialTracks.map(cachedTrack => ({
        id: cachedTrack.id,
        label: cachedTrack.label,
        src: cachedTrack.src,
        default: false,
      }));
    }
    return [];
  });

  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(props?.initialActiveId || null);
  const [subtitleOffset, setSubtitleOffset] = useState<number>(props?.initialOffset || 0);
  
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

  useEffect(() => {
    if (activeSubtitle && subtitleData.has(activeSubtitle)) {
      const cues = subtitleData.get(activeSubtitle)!;
      const newActiveCues = getActiveCues(cues, currentTime - subtitleOffset);
      setCurrentCues(newActiveCues);
    } else {
      setCurrentCues([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubtitle, subtitleData, subtitleOffset]);

  const processSingleSubtitleFile = useCallback(async (file: File): Promise<SubtitleTrack & { vttContent: string }> => {
    console.log('Processing subtitle file:', file.name);
    const rawContent = await file.text();
    const fileName = file.name;
    const extension = fileName.toLowerCase().split('.').pop();
    
    let vttContent = rawContent;
    if (extension === 'srt') vttContent = convertSrtToVtt(rawContent);
    else if (extension === 'ass' || extension === 'ssa') vttContent = convertAssToVtt(rawContent);
    else if (extension !== 'vtt') vttContent = convertSrtToVtt(rawContent); // Basic fallback
    if (!vttContent.startsWith('WEBVTT')) vttContent = 'WEBVTT\n\n' + vttContent;
    
    const cues = parseVttContent(vttContent);
    const trackId = `subtitle-${Date.now()}-${Math.random()}`;
    
    setSubtitleData(prev => new Map(prev.set(trackId, cues)));
    const vttDataUrl = `data:text/vtt;charset=utf-8,${encodeURIComponent(vttContent)}`;
    
    return {
      id: trackId,
      label: fileName.replace(/\.[^/.]+$/, ""),
      src: vttDataUrl,
      default: subtitleTracks.length === 0,
      vttContent: vttContent
    };
  }, [subtitleTracks.length]);

  const addSubtitleFiles = useCallback(async (files: File[]) => {
    const newTracks: SubtitleTrack[] = [];
    const processedTracksData: Array<SubtitleTrack & {vttContentForCache?: string}> = [];

    for (const file of files) {
      try {
        const processedData = await processSingleSubtitleFile(file);
        newTracks.push({id: processedData.id, label: processedData.label, src: processedData.src, default: processedData.default });
      } catch (error) { 
        console.error("Failed to process subtitle file:", file.name, error); 
      }
    }
    
    if (newTracks.length > 0) {
      setSubtitleTracks(prev => [...prev, ...newTracks]);
      if (!activeSubtitle && newTracks.length > 0) {
        setActiveSubtitle(prevActive => prevActive ?? newTracks[0].id);
      }
    }
    return newTracks; 
  }, [processSingleSubtitleFile, activeSubtitle]);

  const removeSubtitleTrack = useCallback((trackId: string) => {
    setSubtitleTracks(prev => prev.filter(track => track.id !== trackId));
    setSubtitleData(prev => { const newMap = new Map(prev); newMap.delete(trackId); return newMap; });
    if (activeSubtitle === trackId) {
      const remainingTracks = subtitleTracks.filter(track => track.id !== trackId);
      setActiveSubtitle(remainingTracks.length > 1 ? remainingTracks.find(t=>t.id !== trackId)?.id ?? null : null);
    }
  }, [activeSubtitle, subtitleTracks]);

  const toggleActiveSubtitle = useCallback((trackId: string | null) => {
    setActiveSubtitle(trackId);
  }, []);

  const resetSubtitleState = useCallback(() => {
    setSubtitleTracks([]);
    setActiveSubtitle(null);
    setSubtitleData(new Map());
    setCurrentCues([]);
    setSubtitleOffset(0);
  }, []);

  const updateSubtitleOffset = useCallback((newOffset: number) => {
    setSubtitleOffset(newOffset);
  }, []);
  
  useEffect(() => {
    if (activeSubtitle && subtitleData.has(activeSubtitle)) {
      const cues = subtitleData.get(activeSubtitle)!;
      const newActiveCues = getActiveCues(cues, currentTime - subtitleOffset);
      setCurrentCues(newActiveCues);
    } else {
      setCurrentCues([]);
    }
  }, [currentTime, activeSubtitle, subtitleData, subtitleOffset]);

  return {
    subtitleTracks,
    activeSubtitle,
    currentCues,
    subtitleOffset,
    subtitleData,
    addSubtitleFiles,
    removeSubtitleTrack,
    toggleActiveSubtitle,
    updateSubtitleOffset,
    resetSubtitleState,
    setSubtitleTracks,
    setActiveSubtitle,
    setSubtitleData,
    setCurrentCues,
    setSubtitleOffset
  };
}; 