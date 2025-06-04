import { SubtitleCue } from '../types';
import { loadDefaultJapaneseParser } from 'budoux';

// Check if text contains Japanese characters
const containsJapanese = (text: string): boolean => {
  // Japanese character ranges: Hiragana, Katakana, Kanji
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  return japaneseRegex.test(text);
};

// Initialize BudouX parser once
const budouxParser = loadDefaultJapaneseParser();

// Parse Japanese text and add color spans
export const colorizeJapaneseText = async (text: string): Promise<string> => {
  if (!containsJapanese(text)) {
    return text; // Return unchanged if no Japanese
  }

  try {
    // BudouX returns an array of segments
    const segments = budouxParser.parse(text);
    const colorizedText = segments
      .map(segment => {
        // Assign colors based on segment content
        const colorClass = getWordColorClass(segment);
        return `<span class="${colorClass}">${segment}</span>`;
      })
      .join('');
    return colorizedText;
  } catch (error) {
    console.warn('Failed to parse Japanese text with budoux:', error);
    return text; // Return unchanged on error
  }
};

// Assign color classes to words for visual variety
const getWordColorClass = (word: string): string => {
  // Simple hash-based color assignment for consistent coloring
  const hash = word.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const colorIndex = Math.abs(hash) % 8; // 8 different colors
  return `jp-word-${colorIndex}`;
};

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