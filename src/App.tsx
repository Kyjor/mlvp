import { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";
import { useSubtitleCustomization } from "./hooks/useSubtitleCustomization";
import { isVideoFile, isSubtitleFile } from "./utils/fileUtils";
import { useVideoPlayer } from "./hooks/useVideoPlayer";
import { useSubtitleManager } from "./hooks/useSubtitleManager";
import { useAudioRecording } from "./hooks/useAudioRecording";
import { useAudioTrackManager } from "./hooks/useAudioTrackManager";
import { SubtitlePoolProvider } from "./contexts/SubtitlePoolContext";
import { FileDropZone } from "./components/FileDropZone";
import { VideoDisplayArea } from "./components/VideoDisplayArea";
import { YouTubeSubtitlePanel } from "./components/YouTubeSubtitlePanel";
import { AudioRecordingControls } from "./components/AudioRecordingControls";
import { AudioTrackControls } from "./components/AudioTrackControls";
import { CachedPlayerData, CachedSubtitleTrack, SubtitleCue, AnkiNote, AnkiNoteWithMedia } from "./types";
import { loadPlayerData, savePlayerData, clearPlayerData } from "./utils/cacheManager";
import { parseVttContent } from "./utils/subtitleParser";
import { SubtitleEditorPanel } from "./components/SubtitleEditorPanel";
import { AnkiModal } from "./components/AnkiModal";

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
  const [showAudioTrackPanel, setShowAudioTrackPanel] = useState(false);
  const [blurSecondarySubtitle, setBlurSecondarySubtitle] = useState(false);
  const [cachedVideoFileIdentifier, setCachedVideoFileIdentifier] = useState<string | null>(null);
  const [cachedSeekTime, setCachedSeekTime] = useState<number | null>(null);
  const [initialCacheLoadComplete, setInitialCacheLoadComplete] = useState(false);
  const [showSubtitleEditor, setShowSubtitleEditor] = useState(false);
  const [editorCues, setEditorCues] = useState<SubtitleCue[] | null>(null);
  const [showAnkiModal, setShowAnkiModal] = useState(false);
  const [ankiNote, setAnkiNote] = useState<Partial<AnkiNote>>({});
  const [ankiScreenshot, setAnkiScreenshot] = useState<string | undefined>(undefined);
  const [ankiAudioData, setAnkiAudioData] = useState<string | undefined>(undefined);
  const [ankiSettings, setAnkiSettings] = useState({
    apiBaseUrl: 'http://localhost:8765/',
    deckName: 'Test'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const subtitleInputRef = useRef<HTMLInputElement>(null);

  const [initialSubtitleTracks, setInitialSubtitleTracks] = useState<CachedSubtitleTrack[] | undefined>(undefined);
  const [initialActiveSubtitleId, setInitialActiveSubtitleId] = useState<string | null | undefined>(undefined);
  const [initialSecondarySubtitleId, setInitialSecondarySubtitleId] = useState<string | null | undefined>(undefined);
  const [initialSubtitleSettings, setInitialSubtitleSettings] = useState<CachedPlayerData['subtitleSettings'] | undefined>(undefined);
  const [initialAudioSettings, setInitialAudioSettings] = useState<CachedPlayerData['audioSettings'] | undefined>(undefined);
  const [initialAudioTrackSettings, setInitialAudioTrackSettings] = useState<CachedPlayerData['audioTrackSettings'] | undefined>(undefined);

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
  const audioTrackManagerHook = useAudioTrackManager({
    videoRef: videoPlayerHook.videoRef,
    initialActiveTrackId: initialAudioTrackSettings?.activeAudioTrackId
  });

  // Debug effect for audio track manager
  useEffect(() => {
    console.log('[App] Audio Track Manager State:', {
      audioTracks: audioTrackManagerHook.audioTracks,
      activeAudioTrack: audioTrackManagerHook.activeAudioTrack,
      isSupported: audioTrackManagerHook.isSupported,
      buttonShouldBeEnabled: audioTrackManagerHook.isSupported
    });
  }, [
    audioTrackManagerHook.audioTracks,
    audioTrackManagerHook.activeAudioTrack,
    audioTrackManagerHook.isSupported
  ]);

  useEffect(() => {
    const cachedData = loadPlayerData();
    if (cachedData) {
      console.log("Found cached data:", cachedData);
      if (cachedData.videoFileIdentifier) {
        setCachedVideoFileIdentifier(cachedData.videoFileIdentifier);
        setCachedSeekTime(cachedData.lastCurrentTime ?? null);
        setLoadingMessage(`Found saved session for ${cachedData.videoFileIdentifier}. Please re-select the video file to restore progress.`);
        setIsLoading(false);
      } else {
        setLoadingMessage("");
        setIsLoading(false); 
      }
      setInitialSubtitleTracks(cachedData.subtitleTracks);
      setInitialActiveSubtitleId(cachedData.activeSubtitleId ?? null);
      setInitialSecondarySubtitleId(cachedData.secondarySubtitleId ?? null);
      setInitialSubtitleSettings(cachedData.subtitleSettings); 
      setInitialAudioSettings(cachedData.audioSettings);
      setInitialAudioTrackSettings(cachedData.audioTrackSettings);
      setBlurSecondarySubtitle(!!cachedData.subtitleSettings.blurSecondary);
      
      subtitleCustomizationHook.setSubtitlePosition(cachedData.subtitleSettings.position);
      subtitleCustomizationHook.setSubtitleSize(cachedData.subtitleSettings.size);
      subtitleManagerHook.setSubtitleTracks(cachedData.subtitleTracks.map(ct => ({
        id: ct.id,
        label: ct.label,
        src: ct.src ?? '',
        default: false,
        language: ct.language ?? '',
        cues: ct.cues ?? []
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
      subtitleManagerHook.setActiveSubtitle(cachedData.activeSubtitleId ?? null);
      subtitleManagerHook.setSubtitleOffset(cachedData.subtitleSettings.offset);
      subtitleManagerHook.setSecondarySubtitle(cachedData.secondarySubtitleId ?? null);
      subtitleManagerHook.setSecondarySubtitleOffset(cachedData.subtitleSettings.secondaryOffset ?? 0);

      // Restore Anki settings
      if (cachedData.ankiSettings) {
        setAnkiSettings({
          apiBaseUrl: cachedData.ankiSettings.apiBaseUrl || 'http://localhost:8765/',
          deckName: cachedData.ankiSettings.deckName || 'Test'
        });
      }

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
      currentTime: videoPlayerHook.currentTime ?? 0,
      videoFileIdentifier: videoPlayerHook.fileName,
      lastCurrentTime: videoPlayerHook.currentTime ?? 0,
      subtitleTracks: subtitleManagerHook.subtitleTracks.map(st => ({
        id: st.id,
        label: st.label,
        src: st.src ?? '',
        language: st.language ?? '',
        cues: st.cues ?? [],
      })),
      activeSubtitleId: subtitleManagerHook.activeSubtitle || undefined,
      secondarySubtitleId: subtitleManagerHook.secondarySubtitle || undefined,
      subtitleSettings: {
        position: subtitleCustomizationHook.subtitlePosition,
        size: subtitleCustomizationHook.subtitleSize,
        offset: subtitleManagerHook.subtitleOffset,
        secondaryOffset: subtitleManagerHook.secondarySubtitleOffset ?? 0,
        blurSecondary: blurSecondarySubtitle,
      },
      audioSettings: {
        volume: (audioRecordingHook as any).volume ?? 1,
        muted: (audioRecordingHook as any).muted ?? false,
        dictionaryBufferSeconds: audioRecordingHook.dictionaryBufferSeconds
      },
      audioTrackSettings: {
        activeAudioTrackId: audioTrackManagerHook.activeAudioTrack || undefined
      },
      ankiSettings: ankiSettings,
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
    audioTrackManagerHook.activeAudioTrack,
    blurSecondarySubtitle,
    ankiSettings,
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
        await videoPlayerHook.processVideo(videoFile, seekTime ?? cachedSeekTime ?? 0);
      } else {
        setLoadingMessage("Loading video...");
        await videoPlayerHook.processVideo(videoFile); 
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

  const handleUrlProcessing = async (url: string) => {
    setIsLoading(true);
    setLoadingMessage("Loading YouTube video...");
    
    try {
      await videoPlayerHook.processVideo(url);
      setCachedVideoFileIdentifier(null);
      setCachedSeekTime(null);
    } catch (error) {
      console.error("Failed to process URL:", error);
      // The error will be handled by the videoPlayerHook
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
  
  // Helper to get cues for the active subtitle
  const getActiveSubtitleCues = () => {
    if (!subtitleManagerHook.activeSubtitle) return null;
    return subtitleManagerHook.subtitleData.get(subtitleManagerHook.activeSubtitle) || null;
  };

  // Handler to open the editor
  const openSubtitleEditor = () => {
    const cues = getActiveSubtitleCues();
    if (cues) {
      setEditorCues([...cues]);
      setShowSubtitleEditor(true);
    }
  };

  // Handler to update cues in the subtitle manager
  const handleCuesUpdate = (updatedCues: SubtitleCue[]) => {
    if (subtitleManagerHook.activeSubtitle) {
      subtitleManagerHook.setSubtitleData(
        new Map([
          ...subtitleManagerHook.subtitleData,
          [subtitleManagerHook.activeSubtitle, updatedCues],
        ])
      );
      setEditorCues([...updatedCues]);
    }
  };

  // Anki handlers
  const handleOpenAnkiModal = (noteWithMedia: AnkiNoteWithMedia) => {
    setAnkiNote(noteWithMedia.note ?? {});
    setAnkiScreenshot(noteWithMedia.screenshot);
    setAnkiAudioData(noteWithMedia.audioData);
    setShowAnkiModal(true);
  };

  const handleAnkiSettingsChange = (apiBaseUrl: string, deckName: string) => {
    setAnkiSettings({ apiBaseUrl, deckName });
  };

  const handleAudioTrackButtonClick = () => {
    console.log('[App] Audio Track button clicked');
    console.log('[App] Current showAudioTrackPanel:', showAudioTrackPanel);
    console.log('[App] Audio track manager isSupported:', audioTrackManagerHook.isSupported);
    console.log('[App] Available audio tracks:', audioTrackManagerHook.audioTracks);
    setShowAudioTrackPanel(!showAudioTrackPanel);
    console.log('[App] Setting showAudioTrackPanel to:', !showAudioTrackPanel);
  };

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
          onUrlSubmit={handleUrlProcessing}
          customMessage={cachedVideoFileIdentifier ? `Please re-select: ${cachedVideoFileIdentifier} to restore your previous session.` : undefined}
        />
      )}
      
      {videoPlayerHook.videoUrl && !videoPlayerHook.videoError && !isLoading && (
        <>
          <VideoDisplayArea 
            videoUrl={videoPlayerHook.videoUrl}
            fileName={videoPlayerHook.fileName}
            isYouTube={videoPlayerHook.isYouTube}
            subtitleTracks={subtitleManagerHook.subtitleTracks}
            activeSubtitle={subtitleManagerHook.activeSubtitle}
            secondarySubtitle={subtitleManagerHook.secondarySubtitle}
            subtitlePosition={subtitleCustomizationHook.subtitlePosition}
            subtitleSize={subtitleCustomizationHook.subtitleSize}
            isDraggingSubtitle={subtitleCustomizationHook.isDraggingSubtitle}
            isSubtitleDragOver={isSubtitleDragOver}
            subtitleOffset={subtitleManagerHook.subtitleOffset}
            secondarySubtitleOffset={subtitleManagerHook.secondarySubtitleOffset}
            isCapturingAudio={audioRecordingHook.isCapturingTimeRange}
            blurSecondary={blurSecondarySubtitle}
            currentTime={videoPlayerHook.currentTime}
            initialTime={videoPlayerHook.pendingInitialTime || undefined}
            subtitleData={subtitleManagerHook.subtitleData}
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
            onInitialTimeHandled={videoPlayerHook.clearPendingInitialTime}
            onSeek={videoPlayerHook.seekToTime}
            captureDictionaryAudio={audioRecordingHook.captureDictionaryAudio}
            dictionaryBufferSeconds={audioRecordingHook.dictionaryBufferSeconds}
            onOpenAnkiModal={handleOpenAnkiModal}
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
            <button 
              onClick={handleAudioTrackButtonClick}
              disabled={!audioTrackManagerHook.isSupported}
            >
              Audio Tracks
            </button>
            <button onClick={openSubtitleEditor}
              disabled={!subtitleManagerHook.activeSubtitle || !getActiveSubtitleCues()}
            >
              Edit Subtitles
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

          {showAudioTrackPanel && (
            <AudioTrackControls
              audioTracks={audioTrackManagerHook.audioTracks}
              activeAudioTrack={audioTrackManagerHook.activeAudioTrack}
              isSupported={audioTrackManagerHook.isSupported}
              onSwitchAudioTrack={audioTrackManagerHook.switchAudioTrack}
              isVisible={showAudioTrackPanel}
              onClose={() => setShowAudioTrackPanel(false)}
            />
          )}

          {showSubtitleEditor && editorCues && (
            <SubtitleEditorPanel
              cues={editorCues}
              onCuesUpdate={handleCuesUpdate}
              onClose={() => setShowSubtitleEditor(false)}
            />
          )}

          {showAnkiModal && (
            <AnkiModal
              open={showAnkiModal}
              onClose={() => setShowAnkiModal(false)}
              initialNote={ankiNote}
              apiBaseUrl={ankiSettings.apiBaseUrl}
              deckName={ankiSettings.deckName}
              onSettingsChange={handleAnkiSettingsChange}
              screenshot={ankiScreenshot}
              audioData={ankiAudioData}
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
