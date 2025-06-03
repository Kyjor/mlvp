import { useState, useEffect, useCallback } from 'react';
import { SubtitleTrack, SubtitleCue } from '../types';
import { convertAssToVtt, convertSrtToVtt } from '../utils/subtitleConverter';
import { parseVttContent, getActiveCues } from '../utils/subtitleParser';

export const useSubtitleManager = (currentTime: number) => {
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);
  const [subtitleData, setSubtitleData] = useState<Map<string, SubtitleCue[]>>(new Map());
  const [currentCues, setCurrentCues] = useState<SubtitleCue[]>([]);

  const processSingleSubtitleFile = useCallback(async (file: File): Promise<SubtitleTrack> => {
    console.log('Processing subtitle file:', file.name);
    const content = await file.text();
    const fileName = file.name;
    const extension = fileName.toLowerCase().split('.').pop();
    
    let vttContent = content;
    
    if (extension === 'srt') {
      vttContent = convertSrtToVtt(content);
    } else if (extension === 'ass' || extension === 'ssa') {
      vttContent = convertAssToVtt(content);
    } else if (extension !== 'vtt') {
      vttContent = convertSrtToVtt(content); // Basic fallback
    }
    
    if (!vttContent.startsWith('WEBVTT')) {
      vttContent = 'WEBVTT\n\n' + vttContent;
    }
    
    const cues = parseVttContent(vttContent);
    console.log('Parsed subtitle cues for', fileName, ':', cues.length);
    
    const trackId = `subtitle-${Date.now()}-${Math.random()}`;
    
    setSubtitleData(prev => new Map(prev.set(trackId, cues)));
    
    const vttDataUrl = `data:text/vtt;charset=utf-8,${encodeURIComponent(vttContent)}`;
    
    return {
      id: trackId,
      label: fileName.replace(/\.[^/.]+$/, ""),
      src: vttDataUrl,
      default: subtitleTracks.length === 0
    };
  }, [subtitleTracks.length]); // Dependency on subtitleTracks.length for the 'default' property

  const addSubtitleFiles = useCallback(async (files: File[]) => {
    const newTracks: SubtitleTrack[] = [];
    for (const file of files) {
      try {
        const track = await processSingleSubtitleFile(file);
        newTracks.push(track);
      } catch (error) {
        console.error("Failed to process subtitle file:", file.name, error);
        // Optionally, notify the user about the failed file
      }
    }
    
    if (newTracks.length > 0) {
      setSubtitleTracks(prev => [...prev, ...newTracks]);
      if (!activeSubtitle) {
        setActiveSubtitle(newTracks[0].id);
      }
    }
    return newTracks; // Return new tracks for potential immediate use if needed
  }, [processSingleSubtitleFile, activeSubtitle]);

  const removeSubtitleTrack = useCallback((trackId: string) => {
    setSubtitleTracks(prev => prev.filter(track => track.id !== trackId));
    setSubtitleData(prev => {
      const newMap = new Map(prev);
      newMap.delete(trackId);
      return newMap;
    });
    
    if (activeSubtitle === trackId) {
      const remainingTracks = subtitleTracks.filter(track => track.id !== trackId);
      // Check length AFTER filtering to correctly get the updated list
      setActiveSubtitle(remainingTracks.length > 1 ? remainingTracks.find(t => t.id !== trackId)?.id ?? null : null);
    }
  }, [activeSubtitle, subtitleTracks]);

  const toggleActiveSubtitle = useCallback((trackId: string | null) => {
    setActiveSubtitle(trackId);
  }, []);

  useEffect(() => {
    if (activeSubtitle && subtitleData.has(activeSubtitle)) {
      const cues = subtitleData.get(activeSubtitle)!;
      const newActiveCues = getActiveCues(cues, currentTime);
      setCurrentCues(newActiveCues);
    } else {
      setCurrentCues([]);
    }
  }, [currentTime, activeSubtitle, subtitleData]);

  const resetSubtitleState = useCallback(() => {
    setSubtitleTracks([]);
    setActiveSubtitle(null);
    setSubtitleData(new Map());
    setCurrentCues([]);
  }, []);

  return {
    subtitleTracks,
    activeSubtitle,
    currentCues,
    addSubtitleFiles,
    removeSubtitleTrack,
    toggleActiveSubtitle,
    resetSubtitleState,
    setSubtitleTracks, // Exposing setters if App.tsx needs to manipulate directly (e.g. on clearVideo)
    setActiveSubtitle,
    setSubtitleData,
    setCurrentCues
  };
}; 