import { SubtitleCue } from '../types';

// Check if text contains Japanese characters
const containsJapanese = (text: string): boolean => {
  // Japanese character ranges: Hiragana, Katakana, Kanji
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  return japaneseRegex.test(text);
};

// Parse Japanese text and add color spans
export const colorizeJapaneseText = async (text: string): Promise<string> => {
  if (!containsJapanese(text)) {
    return text; // Return unchanged if no Japanese
  }

  const ParseJapaneseClass = await initializeJapaneseParser();
  if (!ParseJapaneseClass) {
    return text; // Return unchanged if parser failed to load
  }

  try {
    const parser = new ParseJapaneseClass({ pos: false }); // We don't need POS for now
    
    return new Promise((resolve) => {
      parser.parse(text, (cst: any) => {
        const colorizedText = processJapaneseNodes(cst);
        resolve(colorizedText);
      });
    });
  } catch (error) {
    console.warn('Failed to parse Japanese text:', error);
    return text; // Return unchanged on error
  }
};

// Process NLCST nodes and add color spans
const processJapaneseNodes = (node: any): string => {
  if (!node) return '';
  
  // Handle different node types
  if (node.type === 'TextNode') {
    // Assign colors based on character content or position
    const colorClass = getWordColorClass(node.value);
    return `<span class="${colorClass}">${node.value}</span>`;
  }
  
  if (node.type === 'PunctuationNode') {
    return `<span class="jp-punctuation">${node.value}</span>`;
  }
  
  if (node.type === 'WhiteSpaceNode') {
    return node.value;
  }
  
  // For nodes with children, process all children
  if (node.children && Array.isArray(node.children)) {
    return node.children.map(processJapaneseNodes).join('');
  }
  
  // Fallback - if node has value, return it
  if (node.value) {
    return node.value;
  }
  
  return '';
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

// Dynamically import parse-japanese to avoid SSR issues
let ParseJapanese: any = null;

const initializeJapaneseParser = async () => {
  if (!ParseJapanese) {
    try {
      const module = await import('parse-japanese');
      ParseJapanese = module.default;
    } catch (error) {
      console.warn('Failed to load parse-japanese:', error);
    }
  }
  return ParseJapanese;
}; 