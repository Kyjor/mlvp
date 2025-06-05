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

export interface CachedPlayerData {
  videoFileIdentifier: string | null; // Could be fileName for local files
  lastCurrentTime: number;
  subtitleTracks: CachedSubtitleTrack[];
  activeSubtitleId: string | null;
  secondarySubtitleId?: string | null;
  subtitleSettings: CachedSubtitleSettings;
  audioSettings?: CachedAudioSettings;
  // We can add more here, like volume, playback rate, etc. in the future
} 