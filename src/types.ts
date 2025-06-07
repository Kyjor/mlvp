export interface AnkiNote {
  sentence: string;
  translation: string;
  targetWord: string;
  definitions: string;
  // New fields for audio
  sentenceAudio?: string; // Will contain HTML reference to audio file
  wordAudio?: string; // Will contain HTML reference to audio file
}

export interface AnkiNoteWithMedia extends AnkiNote {
  mediaFiles?: string[];
  note?: Partial<AnkiNote>; // allow undefined fields for modal
  screenshot?: string;
  audioData?: string;
}

export interface SubtitleCue {
  startTime: number;
  endTime: number;
  text: string;
  id?: string;
}

export interface SubtitleTrack {
  id: string;
  language?: string;
  cues?: SubtitleCue[];
  label?: string;
  src?: string;
  default?: boolean;
}

export interface CachedSubtitleTrack extends SubtitleTrack {
  isCached?: boolean;
  src: string;
}

export interface SubtitlePosition {
  x: number;
  y: number;
}

export interface DragState {
  startX: number;
  startY: number;
  currentX?: number;
  currentY?: number;
  isDragging: boolean;
  initialX: number;
  initialY: number;
  initialWidth: number;
  initialHeight: number;
}

export interface SubtitleSettings {
  position: SubtitlePosition;
  size: number;
  offset: number;
  secondaryOffset?: number;
  blurSecondary?: boolean;
}

export interface AudioSettings {
  volume?: number;
  muted?: boolean;
  dictionaryBufferSeconds?: number;
}

export interface AnkiSettings {
  apiBaseUrl: string;
  deckName: string;
}

export interface CachedPlayerData {
  currentTime: number;
  lastCurrentTime?: number;
  subtitleTracks: CachedSubtitleTrack[];
  selectedTrackId?: string;
  videoFileIdentifier?: string;
  activeSubtitleId?: string;
  secondarySubtitleId?: string;
  subtitleSettings: SubtitleSettings;
  audioSettings: AudioSettings;
  ankiSettings?: AnkiSettings;
} 