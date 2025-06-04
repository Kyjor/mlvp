import { SubtitleCue } from '../types';

// Parse VTT content into subtitle cues
export const parseVttContent = (vttContent: string): SubtitleCue[] => {
  const cues: SubtitleCue[] = [];
  const lines = vttContent.split('\n');
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Skip empty lines and WEBVTT header
    if (!line || line === 'WEBVTT') {
      i++;
      continue;
    }
    
    // Check if this is a timestamp line
    if (line.includes('-->')) {
      const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
      if (timeMatch) {
        const startTime = parseVttTime(timeMatch[1]);
        const endTime = parseVttTime(timeMatch[2]);
        
        // Collect text lines until we hit an empty line or end of file
        const textLines: string[] = [];
        i++;
        while (i < lines.length && lines[i].trim() !== '') {
          textLines.push(lines[i].trim());
          i++;
        }
        
        if (textLines.length > 0) {
          cues.push({
            startTime,
            endTime,
            text: textLines.join('\n')
          });
        }
      }
    }
    i++;
  }
  
  return cues;
};

// Parse VTT time format to seconds
export const parseVttTime = (timeStr: string): number => {
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  const secondsParts = parts[2].split('.');
  const seconds = parseInt(secondsParts[0]);
  const milliseconds = parseInt(secondsParts[1]);
  
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
};

// Get active cues for current time
export const getActiveCues = (cues: SubtitleCue[], currentTime: number): SubtitleCue[] => {
  return cues.filter(cue => 
    currentTime >= cue.startTime && currentTime <= cue.endTime
  );
};

export const filterParentheticalText = (text: string): string => {
  // Remove text wrapped in parentheses, including the parentheses themselves
  // This regex matches both ASCII () and full-width （） parentheses commonly used in Japanese text
  return text
    .replace(/\([^)]*\)/g, '') // ASCII parentheses
    .replace(/（[^）]*）/g, '') // Full-width parentheses (Japanese)
    .trim();
}; 