import { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";
import { useSubtitleCustomization } from "./hooks/useSubtitleCustomization";
import { isVideoFile, isSubtitleFile } from "./utils/fileUtils";
import { useVideoPlayer } from "./hooks/useVideoPlayer";
import { useSubtitleManager } from "./hooks/useSubtitleManager";
import { FileDropZone } from "./components/FileDropZone";
import { VideoDisplayArea } from "./components/VideoDisplayArea";
import { YouTubeSubtitlePanel } from "./components/YouTubeSubtitlePanel";

function App() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubtitleDragOver, setIsSubtitleDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [showSubtitlePanel, setShowSubtitlePanel] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const subtitleInputRef = useRef<HTMLInputElement>(null);

  const videoPlayerHook = useVideoPlayer();
  const subtitleManagerHook = useSubtitleManager(videoPlayerHook.currentTime);
  const subtitleCustomizationHook = useSubtitleCustomization();

  const clearAll = useCallback(() => {
    videoPlayerHook.resetVideoState();
    subtitleManagerHook.resetSubtitleState();
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (subtitleInputRef.current) subtitleInputRef.current.value = '';
    setIsLoading(false);
    setLoadingMessage("");
  }, [videoPlayerHook, subtitleManagerHook]);

  const handleMainDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleMainDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleMainDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setIsLoading(true);
    
    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(isVideoFile);
    const subtitleFiles = files.filter(isSubtitleFile);

    if (videoFile) {
      setLoadingMessage("Loading video...");
      await videoPlayerHook.processVideoFile(videoFile);
    }
    
    if (subtitleFiles.length > 0) {
      setLoadingMessage("Processing subtitles...");
      await subtitleManagerHook.addSubtitleFiles(subtitleFiles);
    }
    setIsLoading(false);
    setLoadingMessage("");
  };
  
  const handleMainFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsLoading(true);
    const videoFile = files.find(isVideoFile);
    const subtitleFiles = files.filter(isSubtitleFile);

    if (videoFile) {
      setLoadingMessage("Loading video...");
      await videoPlayerHook.processVideoFile(videoFile);
    }
    if (subtitleFiles.length > 0) {
      setLoadingMessage("Processing subtitles...");
      await subtitleManagerHook.addSubtitleFiles(subtitleFiles);
    }
    setIsLoading(false);
    setLoadingMessage("");
    if(e.target) e.target.value = ''
  };

  const handleDedicatedSubtitleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsSubtitleDragOver(true);
  };

  const handleDedicatedSubtitleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsSubtitleDragOver(false);
  };

  const handleDedicatedSubtitleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsSubtitleDragOver(false);
    setIsLoading(true);
    setLoadingMessage("Processing subtitles...");
    
    const files = Array.from(e.dataTransfer.files).filter(isSubtitleFile);
    if (files.length > 0) {
      await subtitleManagerHook.addSubtitleFiles(files);
    }
    setIsLoading(false);
    setLoadingMessage("");
  };

  const handleDedicatedSubtitleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(isSubtitleFile);
    if (files.length === 0) return;

    setIsLoading(true);
    setLoadingMessage("Processing subtitles...");
    await subtitleManagerHook.addSubtitleFiles(files);
    setIsLoading(false);
    setLoadingMessage("");
    if(e.target) e.target.value = ''
  };

  useEffect(() => {
    const currentVideoUrl = videoPlayerHook.videoUrl;
    return () => {
      if (currentVideoUrl) {
        URL.revokeObjectURL(currentVideoUrl);
      }
    };
  }, [videoPlayerHook.videoUrl]);

  return (
    <main className="container">
      <h1>Video Player</h1>
      
      {isLoading && (
        <div className="loading-container">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p className="loading-message">{loadingMessage}</p>
          </div>
        </div>
      )}
      
      {videoPlayerHook.videoError && !isLoading && (
        <div className="error-container">
          <div className="error-content">
            <h3>⚠️ Playback Error</h3>
            <p>{videoPlayerHook.videoError}</p>
            <p className="error-help">
              This video format may not be supported by your browser. 
              Try converting it to MP4 format for better compatibility.
            </p>
            <button onClick={clearAll} className="error-button">
              Try Another Video
            </button>
          </div>
        </div>
      )}
      
      {!videoPlayerHook.videoUrl && !isLoading && !videoPlayerHook.videoError && (
        <FileDropZone 
          isDragOver={isDragOver}
          onDragOver={handleMainDragOver}
          onDragLeave={handleMainDragLeave}
          onDrop={handleMainDrop}
          onFileInputClick={() => fileInputRef.current?.click()}
          fileInputRef={fileInputRef}
          onFileSelect={handleMainFileSelect}
        />
      )}
      
      {videoPlayerHook.videoUrl && !videoPlayerHook.videoError && !isLoading && (
        <>
          <VideoDisplayArea 
            videoUrl={videoPlayerHook.videoUrl}
            fileName={videoPlayerHook.fileName}
            isPlaying={videoPlayerHook.isPlaying}
            subtitleTracks={subtitleManagerHook.subtitleTracks}
            activeSubtitle={subtitleManagerHook.activeSubtitle}
            currentCues={subtitleManagerHook.currentCues}
            subtitlePosition={subtitleCustomizationHook.subtitlePosition}
            subtitleSize={subtitleCustomizationHook.subtitleSize}
            isDraggingSubtitle={subtitleCustomizationHook.isDraggingSubtitle}
            isSubtitleDragOver={isSubtitleDragOver}
            videoRef={videoPlayerHook.videoRef}
            videoWrapperRef={subtitleCustomizationHook.videoWrapperRef}
            subtitleRef={subtitleCustomizationHook.subtitleRef}
            subtitleInputRef={subtitleInputRef}
            onPlayPauseChange={videoPlayerHook.setIsPlaying}
            onTimeUpdate={videoPlayerHook.handleTimeUpdate}
            onToggleActiveSubtitle={subtitleManagerHook.toggleActiveSubtitle}
            onRemoveSubtitleTrack={subtitleManagerHook.removeSubtitleTrack}
            onResetSubtitlePosition={subtitleCustomizationHook.resetPosition}
            onResetSubtitleSize={subtitleCustomizationHook.resetSize}
            onSubtitleMouseDown={subtitleCustomizationHook.handleSubtitleMouseDown}
            onSubtitleWheel={subtitleCustomizationHook.handleSubtitleWheel}
            onDedicatedSubtitleDragOver={handleDedicatedSubtitleDragOver}
            onDedicatedSubtitleDragLeave={handleDedicatedSubtitleDragLeave}
            onDedicatedSubtitleDrop={handleDedicatedSubtitleDrop}
            onDedicatedSubtitleFileSelect={handleDedicatedSubtitleFileSelect}
          />
          
          <div className="video-controls">
            <button onClick={videoPlayerHook.togglePlayPause}>
              {videoPlayerHook.isPlaying ? 'Pause' : 'Play'}
            </button>
            <button onClick={() => setShowSubtitlePanel(!showSubtitlePanel)}>
              Subtitles/CC
            </button>
            <button onClick={clearAll}>Clear Video</button>
          </div>
          
          {showSubtitlePanel && (
            <div className="ytp-panel" style={{ width: '251px', height: '238px' }}>
              <div className="ytp-panel-header">
                <div className="ytp-panel-back-button-container">
                  <button 
                    className="ytp-button ytp-panel-back-button" 
                    aria-label="Back to previous menu"
                    onClick={() => setShowSubtitlePanel(false)}
                  ></button>
                </div>
                <span className="ytp-panel-title">Subtitles/CC</span>
                <button className="ytp-button ytp-panel-options">Options</button>
              </div>
              <div className="ytp-panel-menu" role="menu" style={{ height: `${Math.max(97, (subtitleManagerHook.subtitleTracks.length + 1) * 48)}px` }}>
                <div 
                  className="ytp-menuitem" 
                  tabIndex={0} 
                  role="menuitemradio" 
                  aria-checked={!subtitleManagerHook.activeSubtitle}
                  onClick={() => subtitleManagerHook.toggleActiveSubtitle(null)}
                >
                  <div className="ytp-menuitem-label">Off</div>
                </div>
                
                {subtitleManagerHook.subtitleTracks.map(track => (
                  <div 
                    key={track.id}
                    className="ytp-menuitem" 
                    tabIndex={0} 
                    role="menuitemradio" 
                    aria-checked={subtitleManagerHook.activeSubtitle === track.id}
                    onClick={() => subtitleManagerHook.toggleActiveSubtitle(track.id)}
                  >
                    <div className="ytp-menuitem-label">{track.label}</div>
                  </div>
                ))}
              </div>
              <div className="ytp-panel-footer" style={{ width: '251px' }}>
                <div className="ytp-panel-footer-content">
                  <span>This setting only applies to the current video. Add more subtitle files using the drop zone above.</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

export default App;
