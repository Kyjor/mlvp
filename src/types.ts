export interface AnkiNote {
  sentence: string;
  translation: string;
  targetWord: string;
  definitions: string;
  // New fields for audio
  sentenceAudio?: string; // Will contain HTML reference to audio file
  wordAudio?: string; // Will contain HTML reference to audio file
} 