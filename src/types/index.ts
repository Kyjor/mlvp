export interface SubtitleTrack {
  id: string;
  label: string;
  src: string;
  default?: boolean;
}

export interface SubtitleCue {
  startTime: number;
  endTime: number;
  text: string;
}

export interface SubtitlePosition {
  x: number;
  y: number;
}

export interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
  initialWidth: number;
  initialHeight: number;
}

// New types for caching
export interface CachedSubtitleTrack {
  id: string;
  label: string;
  src: string; // Store the data URL (which contains VTT content)
}

export interface CachedSubtitleSettings {
  position: SubtitlePosition;
  size: number;
  offset: number;
  secondaryOffset?: number;
  blurSecondary?: boolean;
}

export interface CachedAudioSettings {
  dictionaryBufferSeconds: number;
}

export interface CachedAnkiSettings {
  apiBaseUrl: string;
  deckName: string;
}

export interface AnkiNote {
  sentence: string;
  translation: string;
  targetWord: string;
  definitions: string;
  sentenceAudio?: string; // Will contain HTML reference to audio file
  wordAudio?: string; // Will contain HTML reference to audio file
}

export interface AnkiNoteWithMedia {
  note: Partial<AnkiNote>;
  screenshot?: string; // Base64 data URL
  audioData?: string; // Base64 data URL
}

export interface CachedPlayerData {
  videoFileIdentifier: string | null; // Could be fileName for local files
  lastCurrentTime: number;
  subtitleTracks: CachedSubtitleTrack[];
  activeSubtitleId: string | null;
  secondarySubtitleId?: string | null;
  subtitleSettings: CachedSubtitleSettings;
  audioSettings?: CachedAudioSettings;
  ankiSettings?: CachedAnkiSettings;
  // We can add more here, like volume, playback rate, etc. in the future
} 