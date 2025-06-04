import React from 'react';
import { SubtitleTrack, SubtitleCue, SubtitlePosition } from '../types';
import { SubtitleControls } from './SubtitleControls';
import { SubtitleOverlay } from './SubtitleOverlay';

interface VideoDisplayAreaProps {
  videoUrl: string | null;
  fileName: string;
  isPlaying: boolean;
  subtitleTracks: SubtitleTrack[];
  activeSubtitle: string | null;
  currentCues: SubtitleCue[];
  subtitlePosition: SubtitlePosition;
  subtitleSize: number;
  isDraggingSubtitle: boolean;
  isSubtitleDragOver: boolean; 
  subtitleOffset: number;
  isCapturingAudio: boolean;

  videoRef: React.RefObject<HTMLVideoElement>;
  videoWrapperRef: React.RefObject<HTMLDivElement>;
  subtitleRef: React.RefObject<HTMLDivElement>;
  subtitleInputRef: React.RefObject<HTMLInputElement>;

  onPlayPauseChange: (isPlaying: boolean) => void;
  onTimeUpdate: () => void;
  onToggleActiveSubtitle: (trackId: string | null) => void;
  onRemoveSubtitleTrack: (trackId: string) => void;
  onResetSubtitlePosition: () => void;
  onResetSubtitleSize: () => void;
  onSubtitleMouseDown: (e: React.MouseEvent) => void;
  onSubtitleWheel: (e: React.WheelEvent) => void;
  onDedicatedSubtitleDragOver: (e: React.DragEvent) => void;
  onDedicatedSubtitleDragLeave: (e: React.DragEvent) => void;
  onDedicatedSubtitleDrop: (e: React.DragEvent) => void;
  onDedicatedSubtitleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOffsetChange: (newOffset: number) => void;
  onCaptureAudio: (startTime: number, endTime: number) => void;
}

export const VideoDisplayArea: React.FC<VideoDisplayAreaProps> = ({
  videoUrl,
  fileName,
  isPlaying,
  subtitleTracks,
  activeSubtitle,
  currentCues,
  subtitlePosition,
  subtitleSize,
  isDraggingSubtitle,
  isSubtitleDragOver,
  subtitleOffset,
  isCapturingAudio,
  videoRef,
  videoWrapperRef,
  subtitleRef,
  subtitleInputRef,
  onPlayPauseChange,
  onTimeUpdate,
  onToggleActiveSubtitle,
  onRemoveSubtitleTrack,
  onResetSubtitlePosition,
  onResetSubtitleSize,
  onSubtitleMouseDown,
  onSubtitleWheel,
  onDedicatedSubtitleDragOver,
  onDedicatedSubtitleDragLeave,
  onDedicatedSubtitleDrop,
  onDedicatedSubtitleFileSelect,
  onOffsetChange,
  onCaptureAudio
}) => {
  if (!videoUrl) return null; // Should not happen if App.tsx logic is correct

  return (
    <div className="video-container">
      <div className="video-info">
        <p>Playing: {fileName}</p>
        {subtitleTracks.length > 0 && (
          <p className="subtitle-info">
            📝 {subtitleTracks.length} subtitle track(s) loaded
          </p>
        )}
        {!isPlaying && (
          <p className="playback-hint">
            📹 Click the play button or use player controls to start
          </p>
        )}
      </div>
      
      <div
        className={`subtitle-drop-zone ${isSubtitleDragOver ? 'drag-over' : ''}`}
        onDragOver={onDedicatedSubtitleDragOver}
        onDragLeave={onDedicatedSubtitleDragLeave}
        onDrop={onDedicatedSubtitleDrop}
        onClick={() => subtitleInputRef.current?.click()}
      >
        <div className="subtitle-drop-content">
          <span className="subtitle-drop-icon">📝</span>
          <span className="subtitle-drop-text">
            {isSubtitleDragOver 
              ? "Drop subtitle files here" 
              : "Drag subtitle files here or click to browse"
            }
          </span>
          <span className="subtitle-formats">SRT, VTT, ASS, SSA, SUB</span>
        </div>
        <input
          ref={subtitleInputRef}
          type="file"
          accept=".srt,.vtt,.ass,.ssa,.sub"
          multiple
          onChange={onDedicatedSubtitleFileSelect}
          style={{ display: 'none' }}
        />
      </div>
      
      <SubtitleControls 
        subtitleTracks={subtitleTracks}
        activeSubtitle={activeSubtitle}
        subtitlePosition={subtitlePosition}
        subtitleSize={subtitleSize}
        subtitleOffset={subtitleOffset}
        onToggleSubtitle={onToggleActiveSubtitle} 
        onRemoveSubtitle={onRemoveSubtitleTrack} 
        onResetPosition={onResetSubtitlePosition} 
        onResetSize={onResetSubtitleSize} 
        onOffsetChange={onOffsetChange}
      />
      
      <div className="video-player-container">
        <div 
          className="video-wrapper"
          ref={videoWrapperRef} 
        >
          <video
            ref={videoRef} 
            src={videoUrl}
            controls
            width="100%"
            height="auto"
            onPlay={() => onPlayPauseChange(true)} 
            onPause={() => onPlayPauseChange(false)} 
            onTimeUpdate={onTimeUpdate} 
            onLoadedMetadata={() => {
              console.log('Video loaded:', fileName);
            }}
            crossOrigin="anonymous"
          >
            Your browser does not support the video tag.
          </video>
          
          <SubtitleOverlay
            currentCues={currentCues} 
            subtitlePosition={subtitlePosition} 
            subtitleSize={subtitleSize} 
            isDraggingSubtitle={isDraggingSubtitle} 
            subtitleRef={subtitleRef} 
            onMouseDown={onSubtitleMouseDown} 
            onWheel={onSubtitleWheel} 
            isCapturingAudio={isCapturingAudio}
            onCaptureAudio={onCaptureAudio}
          />
        </div>
      </div>
    </div>
  );
}; 