import React, { useState, useEffect } from 'react';
import { SubtitleTrack, SubtitlePosition, AnkiNote, SubtitleCue } from '../types';
import { SubtitleControls } from './SubtitleControls';
import { PooledSubtitleOverlay } from './PooledSubtitleOverlay';
import { VideoJSPlayer } from './VideoJSPlayer';

interface VideoDisplayAreaProps {
  videoUrl: string | null;
  fileName: string;
  isYouTube?: boolean;
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
  initialTime?: number;
  subtitleData: Map<string, SubtitleCue[]>;

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
  onInitialTimeHandled?: () => void;
  onSeek?: (time: number) => void;
  captureDictionaryAudio?: (startTime: number, endTime: number, buffer: number) => Promise<string>;
  dictionaryBufferSeconds?: number;
  onOpenAnkiModal?: (note: Partial<AnkiNote>) => void;
}

export const VideoDisplayArea: React.FC<VideoDisplayAreaProps> = ({
  videoUrl,
  fileName,
  isYouTube = false,
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
  initialTime,
  subtitleData,
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
  onInitialTimeHandled,
  onSeek,
  captureDictionaryAudio,
  dictionaryBufferSeconds,
  onOpenAnkiModal,
}) => {
  if (!videoUrl) return null; // Should not happen if App.tsx logic is correct

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Get primary subtitle cues for navigation
  const getPrimarySubtitleCues = (): SubtitleCue[] => {
    if (!activeSubtitle || !subtitleData.has(activeSubtitle)) {
      return [];
    }
    return subtitleData.get(activeSubtitle) || [];
  };

  // Find current subtitle index based on current time
  const getCurrentSubtitleIndex = (cues: SubtitleCue[]): number => {
    const adjustedTime = currentTime + subtitleOffset;
    for (let i = 0; i < cues.length; i++) {
      if (adjustedTime >= cues[i].startTime && adjustedTime <= cues[i].endTime) {
        return i;
      }
    }
    
    // If not in any subtitle, find the closest one
    for (let i = 0; i < cues.length - 1; i++) {
      if (adjustedTime >= cues[i].endTime && adjustedTime < cues[i + 1].startTime) {
        return i; // Return current for between subtitles
      }
    }
    
    // If before first subtitle
    if (adjustedTime < cues[0]?.startTime) {
      return -1;
    }
    
    // If after last subtitle
    return cues.length - 1;
  };

  // Navigate to subtitle by index
  const navigateToSubtitle = (targetIndex: number) => {
    const cues = getPrimarySubtitleCues();
    if (cues.length === 0 || targetIndex < 0 || targetIndex >= cues.length) {
      return;
    }

    const targetTime = Math.max(0, cues[targetIndex].startTime - subtitleOffset);
    console.log(`[VideoDisplayArea] Navigating to subtitle ${targetIndex}: "${cues[targetIndex].text}" at ${targetTime}s`);
    
    if (onSeek) {
      onSeek(targetTime);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle arrow keys when video area is focused or no input is focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        (activeElement as HTMLElement).contentEditable === 'true'
      );
      
      if (isInputFocused) {
        return; // Don't interfere with input fields
      }

      const cues = getPrimarySubtitleCues();
      if (cues.length === 0) {
        return; // No subtitles to navigate
      }

      let handled = false;
      const currentIndex = getCurrentSubtitleIndex(cues);

      switch (event.key) {
        case 'ArrowLeft':
          // Go to previous subtitle
          if (currentIndex > 0) {
            navigateToSubtitle(currentIndex - 1);
          } else if (currentIndex === -1 && cues.length > 0) {
            // If before first subtitle, go to first subtitle
            navigateToSubtitle(0);
          }
          handled = true;
          break;

        case 'ArrowRight':
          // Go to next subtitle
          if (currentIndex < cues.length - 1) {
            navigateToSubtitle(currentIndex + 1);
          } else if (currentIndex === -1 && cues.length > 0) {
            // If before first subtitle, go to first subtitle
            navigateToSubtitle(0);
          }
          handled = true;
          break;
      }

      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentTime, activeSubtitle, subtitleData, subtitleOffset, onSeek]);

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
          <VideoJSPlayer
            ref={videoRef}
            src={videoUrl}
            fileName={fileName}
            isYouTube={isYouTube}
            onPlay={() => onPlayPauseChange(true)}
            onPause={() => onPlayPauseChange(false)}
            onTimeUpdate={onTimeUpdate}
            style={{ width: '100%', height: '100%' }}
            initialTime={initialTime}
            onInitialTimeHandled={onInitialTimeHandled}
          />
          
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
            onOpenAnkiModal={onOpenAnkiModal}
            subtitleData={subtitleData}
          />
        </div>
      </div>
      <div className="video-controls">
        <button onClick={handleFullscreenToggle}>
          {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        </button>
        {activeSubtitle && getPrimarySubtitleCues().length > 0 && (
          <div className="navigation-hint">
            💡 Use ← → arrow keys to jump between subtitles
          </div>
        )}
      </div>
    </div>
  );
}; 