// Simple frontend-compatible JMDict dictionary
// Uses raw JMDict JSON data instead of LevelDB

interface JMDictEntry {
  id: number;
  kanji?: Array<{
    common?: boolean;
    text: string;
    tags: string[];
  }>;
  kana: Array<{
    common?: boolean;
    text: string;
    tags: string[];
    appliesToKanji?: string[];
  }>;
  sense: Array<{
    partOfSpeech: string[];
    appliesToKanji?: string[];
    appliesToKana?: string[];
    related?: Array<{
      text: string;
      kana?: string;
    }>;
    antonym?: Array<{
      text: string;
      kana?: string;
    }>;
    gloss: Array<{
      lang: string;
      text: string;
    }>;
    info?: string[];
    example?: Array<{
      text: string;
      english: string;
    }>;
  }>;
}

let jmdictData: JMDictEntry[] | null = null;
let loadingPromise: Promise<JMDictEntry[]> | null = null;

// Load JMDict data from JSON file
async function loadJMDictData(): Promise<JMDictEntry[]> {
  if (jmdictData) {
    return jmdictData;
  }
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async (): Promise<JMDictEntry[]> => {
    try {
      const response = await fetch('/jmdict-all-3.6.1.json');
      if (!response.ok) {
        throw new Error(`Failed to load JMDict data: ${response.status}`);
      }
      const data = await response.json();
      jmdictData = data.words || data; // Handle different JSON structures
      if (!jmdictData || !Array.isArray(jmdictData)) {
        throw new Error('Invalid JMDict data format');
      }
      console.log(`Loaded ${jmdictData.length} JMDict entries`);
      return jmdictData;
    } catch (error) {
      console.error('Failed to load JMDict data:', error);
      jmdictData = []; // Set to empty array on error
      return jmdictData;
    }
  })();

  return loadingPromise;
}

// Search for entries by kanji text (beginning match)
export async function lookupKanjiBeginning(query: string, limit: number = 10): Promise<JMDictEntry[]> {
  const data = await loadJMDictData();
  const results: JMDictEntry[] = [];
  
  for (const entry of data) {
    if (results.length >= limit) break;
    
    // Check kanji fields
    if (entry.kanji) {
      for (const kanjiEntry of entry.kanji) {
        if (kanjiEntry.text.startsWith(query)) {
          results.push(entry);
          break;
        }
      }
    }
    
    // Also check kana fields for hiragana/katakana lookups
    if (results.length < limit && !results.includes(entry)) {
      for (const kanaEntry of entry.kana) {
        if (kanaEntry.text.startsWith(query)) {
          results.push(entry);
          break;
        }
      }
    }
  }
  
  return results;
}

// Search for entries by reading text (beginning match)
export async function lookupReadingBeginning(query: string, limit: number = 10): Promise<JMDictEntry[]> {
  const data = await loadJMDictData();
  const results: JMDictEntry[] = [];
  
  for (const entry of data) {
    if (results.length >= limit) break;
    
    for (const kanaEntry of entry.kana) {
      if (kanaEntry.text.startsWith(query)) {
        results.push(entry);
        break;
      }
    }
  }
  
  return results;
}

// Search for entries by kanji text (anywhere match)
export async function lookupKanjiAnywhere(query: string, limit: number = 10): Promise<JMDictEntry[]> {
  const data = await loadJMDictData();
  const results: JMDictEntry[] = [];
  
  for (const entry of data) {
    if (results.length >= limit) break;
    
    if (entry.kanji) {
      for (const kanjiEntry of entry.kanji) {
        if (kanjiEntry.text.includes(query)) {
          results.push(entry);
          break;
        }
      }
    }
    
    if (results.length < limit && !results.includes(entry)) {
      for (const kanaEntry of entry.kana) {
        if (kanaEntry.text.includes(query)) {
          results.push(entry);
          break;
        }
      }
    }
  }
  
  return results;
}

// Search for entries by reading text (anywhere match) 
export async function lookupReadingAnywhere(query: string, limit: number = 10): Promise<JMDictEntry[]> {
  const data = await loadJMDictData();
  const results: JMDictEntry[] = [];
  
  for (const entry of data) {
    if (results.length >= limit) break;
    
    for (const kanaEntry of entry.kana) {
      if (kanaEntry.text.includes(query)) {
        results.push(entry);
        break;
      }
    }
  }
  
  return results;
}

// Get database info (for compatibility)
export async function getDb(): Promise<any> {
  await loadJMDictData();
  return { loaded: true, entries: jmdictData?.length || 0 };
}

// Helper functions for compatibility
export async function getTags(): Promise<string[]> {
  // Return common tags used in JMDict
  return ['common', 'irregular', 'outdated', 'rare'];
}

export async function getField(entry: JMDictEntry, field: string): Promise<any> {
  return (entry as any)[field];
}

export async function expandIds(ids: number[]): Promise<JMDictEntry[]> {
  const data = await loadJMDictData();
  return data.filter(entry => ids.includes(entry.id));
} 