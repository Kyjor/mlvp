import React, { useState, useEffect } from 'react';
import { SubtitleTrack, SubtitlePosition } from '../types';
import { SubtitleControls } from './SubtitleControls';
import { PooledSubtitleOverlay } from './PooledSubtitleOverlay';

interface VideoDisplayAreaProps {
  videoUrl: string | null;
  fileName: string;
  isPlaying: boolean;
  subtitleTracks: SubtitleTrack[];
  activeSubtitle: string | null;
  secondarySubtitle: string | null;
  subtitlePosition: SubtitlePosition;
  subtitleSize: number;
  isDraggingSubtitle: boolean;
  isSubtitleDragOver: boolean; 
  subtitleOffset: number;
  secondarySubtitleOffset: number;
  isCapturingAudio: boolean;
  blurSecondary: boolean;
  currentTime?: number;

  videoRef: React.RefObject<HTMLVideoElement>;
  videoWrapperRef: React.RefObject<HTMLDivElement>;
  subtitleRef: React.RefObject<HTMLDivElement>;
  subtitleInputRef: React.RefObject<HTMLInputElement>;

  onPlayPauseChange: (isPlaying: boolean) => void;
  onTimeUpdate: (time: number) => void;
  onToggleActiveSubtitle: (trackId: string | null) => void;
  onToggleSecondarySubtitle: (trackId: string | null) => void;
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
  onSecondaryOffsetChange: (newOffset: number) => void;
  onCaptureAudio?: (startTime: number, endTime: number) => void;
  onToggleBlurSecondary: (enabled: boolean) => void;
  captureDictionaryAudio?: (startTime: number, endTime: number, buffer: number) => Promise<string>;
  dictionaryBufferSeconds?: number;
}

export const VideoDisplayArea: React.FC<VideoDisplayAreaProps> = ({
  videoUrl,
  fileName,
  isPlaying,
  subtitleTracks,
  activeSubtitle,
  secondarySubtitle,
  subtitlePosition,
  subtitleSize,
  isDraggingSubtitle,
  isSubtitleDragOver,
  subtitleOffset,
  secondarySubtitleOffset,
  isCapturingAudio,
  blurSecondary,
  currentTime = 0,
  videoRef,
  videoWrapperRef,
  subtitleRef,
  subtitleInputRef,
  onPlayPauseChange,
  onTimeUpdate,
  onToggleActiveSubtitle,
  onToggleSecondarySubtitle,
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
  onSecondaryOffsetChange,
  onCaptureAudio,
  onToggleBlurSecondary,
  captureDictionaryAudio,
  dictionaryBufferSeconds,
}) => {
  if (!videoUrl) return null; // Should not happen if App.tsx logic is correct

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleFullscreenToggle = () => {
    if (!videoWrapperRef.current) return;
    if (!document.fullscreenElement) {
      videoWrapperRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

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
        secondarySubtitle={secondarySubtitle}
        subtitlePosition={subtitlePosition}
        subtitleSize={subtitleSize}
        subtitleOffset={subtitleOffset}
        secondarySubtitleOffset={secondarySubtitleOffset}
        blurSecondary={blurSecondary}
        onToggleSubtitle={onToggleActiveSubtitle}
        onToggleSecondarySubtitle={onToggleSecondarySubtitle}
        onRemoveSubtitle={onRemoveSubtitleTrack} 
        onResetPosition={onResetSubtitlePosition} 
        onResetSize={onResetSubtitleSize} 
        onOffsetChange={onOffsetChange}
        onSecondaryOffsetChange={onSecondaryOffsetChange}
        onToggleBlurSecondary={onToggleBlurSecondary}
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
            onPlay={() => onPlayPauseChange(true)}
            onPause={() => onPlayPauseChange(false)}
            onTimeUpdate={(e) => {
              const video = e.target as HTMLVideoElement;
              onTimeUpdate(video.currentTime);
            }}
            style={{ width: '100%', height: '100%' }}
          >
            Your browser does not support the video tag.
          </video>
          
          <PooledSubtitleOverlay
            currentTime={currentTime}
            primaryTrackId={activeSubtitle}
            secondaryTrackId={secondarySubtitle}
            subtitlePosition={subtitlePosition} 
            subtitleSize={subtitleSize}
            primarySubtitleOffset={subtitleOffset}
            secondarySubtitleOffset={secondarySubtitleOffset}
            isDraggingSubtitle={isDraggingSubtitle}
            isCapturingAudio={isCapturingAudio}
            subtitleRef={subtitleRef}
            videoRef={videoRef}
            onMouseDown={onSubtitleMouseDown}
            onWheel={onSubtitleWheel}
            onCaptureAudio={onCaptureAudio}
            blurSecondary={blurSecondary}
            captureDictionaryAudio={captureDictionaryAudio}
            dictionaryBufferSeconds={dictionaryBufferSeconds}
          />
        </div>
      </div>
      <div className="video-controls">
        <button onClick={handleFullscreenToggle}>
          {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        </button>
      </div>
    </div>
  );
}; 