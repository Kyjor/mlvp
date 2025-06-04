import { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";
import { useSubtitleCustomization } from "./hooks/useSubtitleCustomization";
import { isVideoFile, isSubtitleFile } from "./utils/fileUtils";
import { useVideoPlayer } from "./hooks/useVideoPlayer";
import { useSubtitleManager } from "./hooks/useSubtitleManager";
import { useAudioRecording } from "./hooks/useAudioRecording";
import { SubtitlePoolProvider } from "./contexts/SubtitlePoolContext";
import { FileDropZone } from "./components/FileDropZone";
import { VideoDisplayArea } from "./components/VideoDisplayArea";
import { YouTubeSubtitlePanel } from "./components/YouTubeSubtitlePanel";
import { AudioRecordingControls } from "./components/AudioRecordingControls";
import { CachedPlayerData, CachedSubtitleTrack, SubtitleCue } from "./types";
import { loadPlayerData, savePlayerData, clearPlayerData } from "./utils/cacheManager";
import { parseVttContent } from "./utils/subtitleParser";

function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
}

function App() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubtitleDragOver, setIsSubtitleDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Checking for saved session...");
  const [showSubtitlePanel, setShowSubtitlePanel] = useState(false);
  const [showAudioRecording, setShowAudioRecording] = useState(false);
  const [blurSecondarySubtitle, setBlurSecondarySubtitle] = useState(false);
  const [cachedVideoFileIdentifier, setCachedVideoFileIdentifier] = useState<string | null>(null);
  const [cachedSeekTime, setCachedSeekTime] = useState<number | null>(null);
  const [initialCacheLoadComplete, setInitialCacheLoadComplete] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const subtitleInputRef = useRef<HTMLInputElement>(null);

  const [initialVideoPlayerState, setInitialVideoPlayerState] = useState<{fileName: string | null, currentTime: number}>({fileName: null, currentTime: 0});
  const [initialSubtitleTracks, setInitialSubtitleTracks] = useState<CachedSubtitleTrack[] | undefined>(undefined);
  const [initialActiveSubtitleId, setInitialActiveSubtitleId] = useState<string | null | undefined>(undefined);
  const [initialSecondarySubtitleId, setInitialSecondarySubtitleId] = useState<string | null | undefined>(undefined);
  const [initialSubtitleSettings, setInitialSubtitleSettings] = useState<CachedPlayerData['subtitleSettings'] | undefined>(undefined);
  const [initialAudioSettings, setInitialAudioSettings] = useState<CachedPlayerData['audioSettings'] | undefined>(undefined);

  const videoPlayerHook = useVideoPlayer();
  const subtitleCustomizationHook = useSubtitleCustomization({
    initialPosition: initialSubtitleSettings?.position,
    initialSize: initialSubtitleSettings?.size,
  });
  const subtitleManagerHook = useSubtitleManager(videoPlayerHook.currentTime, {
    initialTracks: initialSubtitleTracks,
    initialActiveId: initialActiveSubtitleId,
    initialSecondaryId: initialSecondarySubtitleId,
    initialOffset: initialSubtitleSettings?.offset,
    initialSecondaryOffset: initialSubtitleSettings?.secondaryOffset,
  });
  const audioRecordingHook = useAudioRecording({
    videoRef: videoPlayerHook.videoRef,
    bufferDurationSeconds: 30,
    initialDictionaryBuffer: initialAudioSettings?.dictionaryBufferSeconds || 0
  });

  useEffect(() => {
    const cachedData = loadPlayerData();
    if (cachedData) {
      console.log("Found cached data:", cachedData);
      if (cachedData.videoFileIdentifier) {
        setCachedVideoFileIdentifier(cachedData.videoFileIdentifier);
        setCachedSeekTime(cachedData.lastCurrentTime);
        setLoadingMessage(`Found saved session for ${cachedData.videoFileIdentifier}. Please re-select the video file to restore progress.`);
        setIsLoading(false);
      } else {
        setLoadingMessage("");
        setIsLoading(false); 
      }
      setInitialSubtitleTracks(cachedData.subtitleTracks);
      setInitialActiveSubtitleId(cachedData.activeSubtitleId);
      setInitialSecondarySubtitleId(cachedData.secondarySubtitleId);
      setInitialSubtitleSettings(cachedData.subtitleSettings); 
      setInitialAudioSettings(cachedData.audioSettings);
      
      subtitleCustomizationHook.setSubtitlePosition(cachedData.subtitleSettings.position);
      subtitleCustomizationHook.setSubtitleSize(cachedData.subtitleSettings.size);
      subtitleManagerHook.setSubtitleTracks(cachedData.subtitleTracks.map(ct => ({
        id: ct.id, 
        label: ct.label, 
        src: ct.src,
        default: false
      })));
      const initialMap = new Map<string, SubtitleCue[]>();
      cachedData.subtitleTracks.forEach(cachedTrack => {
        try { 
          if (cachedTrack.src.startsWith('data:text/vtt;charset=utf-8,')) {
            const vttContent = decodeURIComponent(cachedTrack.src.split(',')[1]);
            const cues = parseVttContent(vttContent);
            initialMap.set(cachedTrack.id, cues);
          }
        } catch (e) { 
          console.error("Error parsing cached VTT:", e); 
        }
      });
      subtitleManagerHook.setSubtitleData(initialMap);
      subtitleManagerHook.setActiveSubtitle(cachedData.activeSubtitleId);
      subtitleManagerHook.setSubtitleOffset(cachedData.subtitleSettings.offset);
      subtitleManagerHook.setSecondarySubtitle(cachedData.secondarySubtitleId ?? null);
      subtitleManagerHook.setSecondarySubtitleOffset(cachedData.subtitleSettings.secondaryOffset ?? 0);

    } else {
      setIsLoading(false);
      setLoadingMessage("");
    }
    setInitialCacheLoadComplete(true);
  }, []);

  const debouncedSaveCurrentTime = useCallback(
    debounce((time: number) => {
      const currentData = loadPlayerData();
      if (currentData && currentData.videoFileIdentifier === videoPlayerHook.fileName) {
        savePlayerData({ ...currentData, lastCurrentTime: time });
      }
    }, 1000),
    [videoPlayerHook.fileName]
  );
  
  useEffect(() => {
    if (!initialCacheLoadComplete || !videoPlayerHook.fileName) return;

    if (videoPlayerHook.currentTime > 0) {
      debouncedSaveCurrentTime(videoPlayerHook.currentTime);
    }

    const playerData: CachedPlayerData = {
      videoFileIdentifier: videoPlayerHook.fileName,
      lastCurrentTime: videoPlayerHook.currentTime,
      subtitleTracks: subtitleManagerHook.subtitleTracks.map(st => ({
        id: st.id,
        label: st.label,
        src: st.src
      })),
      activeSubtitleId: subtitleManagerHook.activeSubtitle,
      secondarySubtitleId: subtitleManagerHook.secondarySubtitle,
      subtitleSettings: {
        position: subtitleCustomizationHook.subtitlePosition,
        size: subtitleCustomizationHook.subtitleSize,
        offset: subtitleManagerHook.subtitleOffset,
        secondaryOffset: subtitleManagerHook.secondarySubtitleOffset ?? 0,
      },
      audioSettings: {
        dictionaryBufferSeconds: audioRecordingHook.dictionaryBufferSeconds
      },
    };
    savePlayerData(playerData);

  }, [
    initialCacheLoadComplete,
    videoPlayerHook.fileName, 
    videoPlayerHook.currentTime,
    subtitleManagerHook.subtitleTracks, 
    subtitleManagerHook.activeSubtitle, 
    subtitleManagerHook.subtitleOffset,
    subtitleManagerHook.secondarySubtitle,
    subtitleManagerHook.secondarySubtitleOffset,
    subtitleCustomizationHook.subtitlePosition, 
    subtitleCustomizationHook.subtitleSize,
    audioRecordingHook.dictionaryBufferSeconds,
    debouncedSaveCurrentTime
  ]);

  const clearAll = useCallback(async () => {
    videoPlayerHook.resetVideoState();
    subtitleManagerHook.resetSubtitleState();
    subtitleCustomizationHook.resetPosition();
    subtitleCustomizationHook.resetSize();
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (subtitleInputRef.current) subtitleInputRef.current.value = '';
    setIsLoading(false);
    setLoadingMessage("");
    setCachedVideoFileIdentifier(null);
    setCachedSeekTime(null);
    clearPlayerData();
  }, [videoPlayerHook, subtitleManagerHook, subtitleCustomizationHook]);

  const handleFileProcessing = async (videoFile: File | null, subtitleFiles: File[], isInitialLoadWithCache?: boolean, seekTime?: number) => {
    setIsLoading(true);
    if (videoFile) {
      if (isInitialLoadWithCache && cachedVideoFileIdentifier && videoFile.name === cachedVideoFileIdentifier) {
        setLoadingMessage(`Restoring video ${videoFile.name}...`);
        await videoPlayerHook.processVideoFile(videoFile, seekTime ?? cachedSeekTime ?? 0);
      } else {
        setLoadingMessage("Loading video...");
        await videoPlayerHook.processVideoFile(videoFile); 
      }
      setCachedVideoFileIdentifier(null);
      setCachedSeekTime(null);
    }
    if (subtitleFiles.length > 0) {
      setLoadingMessage("Processing subtitles...");
      await subtitleManagerHook.addSubtitleFiles(subtitleFiles);
    }
    setIsLoading(false);
    setLoadingMessage("");
  };

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
    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(isVideoFile) || null;
    const subtitleFiles = files.filter(isSubtitleFile);
    await handleFileProcessing(videoFile, subtitleFiles, !!cachedVideoFileIdentifier, cachedSeekTime || undefined);
  };
  
  const handleMainFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 && !cachedVideoFileIdentifier) return;

    if (files.length > 0) {
        const videoFile = files.find(isVideoFile) || null;
        const subtitleFiles = files.filter(isSubtitleFile);
        await handleFileProcessing(videoFile, subtitleFiles, !!cachedVideoFileIdentifier, cachedSeekTime || undefined);
        if(e.target) e.target.value = ''
    } else if (cachedVideoFileIdentifier && fileInputRef.current) {
        console.log("File selection cancelled, cached video prompt remains.");
    }
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
    if(e.target) e.target.value = '';
  };

  useEffect(() => {
    const currentVideoUrl = videoPlayerHook.videoUrl;
    return () => {
      if (currentVideoUrl) URL.revokeObjectURL(currentVideoUrl);
    };
  }, [videoPlayerHook.videoUrl]);
  
  return (
    <main className="container">
      <h1>Video Player</h1>
      
      {isLoading && (
        <div className="loading-container">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p className="loading-message">{loadingMessage || "Loading..."}</p>
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
            <button onClick={clearAll} className="error-button">Try Another Video</button>
          </div>
        </div>
      )}
      
      {!videoPlayerHook.videoUrl && !isLoading && !videoPlayerHook.videoError && (
        <FileDropZone 
          isDragOver={isDragOver}
          onDragOver={handleMainDragOver}
          onDragLeave={handleMainDragLeave}
          onDrop={handleMainDrop}
          onFileInputClick={() => {
            fileInputRef.current?.click();
          }}
          fileInputRef={fileInputRef}
          onFileSelect={handleMainFileSelect}
          customMessage={cachedVideoFileIdentifier ? `Please re-select: ${cachedVideoFileIdentifier} to restore your previous session.` : undefined}
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
            secondarySubtitle={subtitleManagerHook.secondarySubtitle}
            currentCues={subtitleManagerHook.currentCues}
            currentSecondaryCues={subtitleManagerHook.currentSecondaryCues}
            subtitlePosition={subtitleCustomizationHook.subtitlePosition}
            subtitleSize={subtitleCustomizationHook.subtitleSize}
            isDraggingSubtitle={subtitleCustomizationHook.isDraggingSubtitle}
            isSubtitleDragOver={isSubtitleDragOver}
            subtitleOffset={subtitleManagerHook.subtitleOffset}
            secondarySubtitleOffset={subtitleManagerHook.secondarySubtitleOffset}
            isCapturingAudio={audioRecordingHook.isCapturingTimeRange}
            blurSecondary={blurSecondarySubtitle}
            currentTime={videoPlayerHook.currentTime}
            videoRef={videoPlayerHook.videoRef}
            videoWrapperRef={subtitleCustomizationHook.videoWrapperRef}
            subtitleRef={subtitleCustomizationHook.subtitleRef}
            subtitleInputRef={subtitleInputRef}
            onPlayPauseChange={videoPlayerHook.setIsPlaying} 
            onTimeUpdate={videoPlayerHook.handleTimeUpdate}
            onToggleActiveSubtitle={subtitleManagerHook.toggleActiveSubtitle}
            onToggleSecondarySubtitle={subtitleManagerHook.toggleSecondarySubtitle}
            onRemoveSubtitleTrack={subtitleManagerHook.removeSubtitleTrack}
            onResetSubtitlePosition={subtitleCustomizationHook.resetPosition}
            onResetSubtitleSize={subtitleCustomizationHook.resetSize}
            onSubtitleMouseDown={subtitleCustomizationHook.handleSubtitleMouseDown}
            onSubtitleWheel={subtitleCustomizationHook.handleSubtitleWheel}
            onDedicatedSubtitleDragOver={handleDedicatedSubtitleDragOver}
            onDedicatedSubtitleDragLeave={handleDedicatedSubtitleDragLeave}
            onDedicatedSubtitleDrop={handleDedicatedSubtitleDrop}
            onDedicatedSubtitleFileSelect={handleDedicatedSubtitleFileSelect}
            onOffsetChange={subtitleManagerHook.updateSubtitleOffset}
            onSecondaryOffsetChange={subtitleManagerHook.updateSecondarySubtitleOffset}
            onCaptureAudio={audioRecordingHook.captureTimeRange}
            onToggleBlurSecondary={setBlurSecondarySubtitle}
            captureDictionaryAudio={audioRecordingHook.captureDictionaryAudio}
            dictionaryBufferSeconds={audioRecordingHook.dictionaryBufferSeconds}
          />
          
          <div className="video-controls">
            <button onClick={videoPlayerHook.togglePlayPause}>
              {videoPlayerHook.isPlaying ? 'Pause' : 'Play'}
            </button>
            <button onClick={() => setShowSubtitlePanel(!showSubtitlePanel)}>
              Subtitles/CC
            </button>
            <button onClick={() => setShowAudioRecording(!showAudioRecording)}>
              Audio Recording
            </button>
            <button onClick={clearAll}>Clear Video & Cache</button>
          </div>
          
          {showSubtitlePanel && (
            <YouTubeSubtitlePanel 
              isVisible={showSubtitlePanel}
              subtitleTracks={subtitleManagerHook.subtitleTracks}
              activeSubtitle={subtitleManagerHook.activeSubtitle}
              onToggleSubtitle={subtitleManagerHook.toggleActiveSubtitle}
              onClose={() => setShowSubtitlePanel(false)} 
            />
          )}

          {showAudioRecording && (
            <AudioRecordingControls
              isRecording={audioRecordingHook.isRecording}
              isSupported={audioRecordingHook.isSupported}
              error={audioRecordingHook.error}
              bufferDuration={audioRecordingHook.bufferDuration}
              isCapturingTimeRange={audioRecordingHook.isCapturingTimeRange}
              dictionaryBufferSeconds={audioRecordingHook.dictionaryBufferSeconds}
              onStartRecording={audioRecordingHook.startRecording}
              onStopRecording={audioRecordingHook.stopRecording}
              onDownloadAudio={audioRecordingHook.downloadBufferedAudio}
              onCopyAudioDataUrl={audioRecordingHook.copyAudioDataUrl}
              onCopyAudioAsHtml={audioRecordingHook.copyAudioAsHtml}
              onSetBufferDuration={audioRecordingHook.setBufferDuration}
              onSetDictionaryBufferSeconds={audioRecordingHook.setDictionaryBufferSeconds}
              onClearError={audioRecordingHook.clearError}
            />
          )}
        </>
      )}
    </main>
  );
}

export default function AppWithProvider() {
  return (
    <SubtitlePoolProvider>
      <App />
    </SubtitlePoolProvider>
  );
}
