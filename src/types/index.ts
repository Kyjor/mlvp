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
  startPos: { x: number; y: number };
  initialPos: { x: number; y: number };
} 