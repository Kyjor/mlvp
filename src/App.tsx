import { useState, useRef, useEffect } from "react";
import "./App.css";
import { SubtitleTrack, SubtitleCue } from "./types";
import { convertAssToVtt, convertSrtToVtt } from "./utils/subtitleConverter";
import { parseVttContent, getActiveCues } from "./utils/subtitleParser";
import { useSubtitleCustomization } from "./hooks/useSubtitleCustomization";
import { SubtitleOverlay } from "./components/SubtitleOverlay";
import { SubtitleControls } from "./components/SubtitleControls";

function App() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubtitleDragOver, setIsSubtitleDragOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [videoError, setVideoError] = useState<string | null>(null);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);
  const [currentCues, setCurrentCues] = useState<SubtitleCue[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [subtitleData, setSubtitleData] = useState<Map<string, SubtitleCue[]>>(new Map());
  const [showSubtitlePanel, setShowSubtitlePanel] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subtitleInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    subtitlePosition,
    subtitleSize,
    isDraggingSubtitle,
    subtitleRef,
    videoWrapperRef,
    handleSubtitleMouseDown,
    handleSubtitleWheel,
    resetPosition,
    resetSize
  } = useSubtitleCustomization();

  // Video file extensions that we want to support
  const supportedVideoExtensions = [
    '.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.m4v', '.3gp', '.flv', '.wmv'
  ];

  // Subtitle file extensions
  const supportedSubtitleExtensions = [
    '.srt', '.vtt', '.ass', '.ssa', '.sub'
  ];

  const isVideoFile = (file: File) => {
    if (file.type.startsWith('video/')) {
      return true;
    }
    const fileName = file.name.toLowerCase();
    return supportedVideoExtensions.some(ext => fileName.endsWith(ext));
  };

  const isSubtitleFile = (file: File) => {
    const fileName = file.name.toLowerCase();
    return supportedSubtitleExtensions.some(ext => fileName.endsWith(ext));
  };

  // Process subtitle file
  const processSubtitleFile = async (file: File): Promise<SubtitleTrack> => {
    console.log('Processing subtitle file:', file.name);
    const content = await file.text();
    const fileName = file.name;
    const extension = fileName.toLowerCase().split('.').pop();
    
    let vttContent = content;
    
    if (extension === 'srt') {
      vttContent = convertSrtToVtt(content);
    } else if (extension === 'ass' || extension === 'ssa') {
      vttContent = convertAssToVtt(content);
    } else if (extension !== 'vtt') {
      vttContent = convertSrtToVtt(content); // Basic fallback
    }
    
    if (!vttContent.startsWith('WEBVTT')) {
      vttContent = 'WEBVTT\n\n' + vttContent;
    }
    
    const cues = parseVttContent(vttContent);
    console.log('Parsed subtitle cues:', cues.length);
    
    const trackId = `subtitle-${Date.now()}-${Math.random()}`;
    
    setSubtitleData(prev => new Map(prev.set(trackId, cues)));
    
    const vttDataUrl = `data:text/vtt;charset=utf-8,${encodeURIComponent(vttContent)}`;
    
    console.log('Created subtitle track with', cues.length, 'cues:', fileName);
    
    return {
      id: trackId,
      label: fileName.replace(/\.[^/.]+$/, ""),
      src: vttDataUrl,
      default: subtitleTracks.length === 0
    };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(file => isVideoFile(file));
    const subtitleFiles = files.filter(file => isSubtitleFile(file));
    
    if (videoFile) {
      processVideoFile(videoFile);
    }
    
    if (subtitleFiles.length > 0) {
      processSubtitleFiles(subtitleFiles);
    }
  };

  const handleSubtitleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsSubtitleDragOver(true);
  };

  const handleSubtitleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsSubtitleDragOver(false);
  };

  const handleSubtitleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsSubtitleDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const subtitleFiles = files.filter(file => isSubtitleFile(file));
    
    if (subtitleFiles.length > 0) {
      processSubtitleFiles(subtitleFiles);
    }
  };

  const handleSubtitleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const subtitleFiles = files.filter(file => isSubtitleFile(file));
    
    if (subtitleFiles.length > 0) {
      processSubtitleFiles(subtitleFiles);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const videoFile = files.find(file => isVideoFile(file));
    const subtitleFiles = files.filter(file => isSubtitleFile(file));
    
    if (videoFile) {
      processVideoFile(videoFile);
    }
    
    if (subtitleFiles.length > 0) {
      processSubtitleFiles(subtitleFiles);
    }
  };

  const processSubtitleFiles = async (files: File[]) => {
    setIsLoading(true);
    setLoadingMessage("Processing subtitle files...");
    
    try {
      const newTracks: SubtitleTrack[] = [];
      
      for (const file of files) {
        const track = await processSubtitleFile(file);
        newTracks.push(track);
      }
      
      setSubtitleTracks(prev => [...prev, ...newTracks]);
      
      if (!activeSubtitle && newTracks.length > 0) {
        setActiveSubtitle(newTracks[0].id);
      }
      
      setLoadingMessage("");
    } catch (error) {
      console.error("Failed to process subtitle files:", error);
      setVideoError("Failed to process subtitle files");
    } finally {
      setIsLoading(false);
    }
  };

  const processVideoFile = async (file: File) => {
    setIsLoading(true);
    setLoadingMessage("Loading video...");
    setVideoError(null);
    
    try {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setFileName(file.name);
      setIsPlaying(false);
      
      setIsLoading(false);
      setLoadingMessage("");
      
    } catch (error) {
      console.error("Failed to process video:", error);
      setVideoError("Failed to load video file");
      setIsLoading(false);
    }
  };

  const clearVideo = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    
    setVideoUrl(null);
    setFileName("");
    setIsPlaying(false);
    setIsLoading(false);
    setLoadingMessage("");
    setVideoError(null);
    setSubtitleTracks([]);
    setActiveSubtitle(null);
    setCurrentCues([]);
    setSubtitleData(new Map());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (subtitleInputRef.current) {
      subtitleInputRef.current.value = '';
    }
  };

  const removeSubtitle = (trackId: string) => {
    setSubtitleTracks(prev => prev.filter(track => track.id !== trackId));
    setSubtitleData(prev => {
      const newMap = new Map(prev);
      newMap.delete(trackId);
      return newMap;
    });
    
    if (activeSubtitle === trackId) {
      const remainingTracks = subtitleTracks.filter(track => track.id !== trackId);
      setActiveSubtitle(remainingTracks.length > 0 ? remainingTracks[0].id : null);
    }
  };

  const toggleSubtitle = (trackId: string | null) => {
    setActiveSubtitle(trackId);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(console.error);
      }
    }
  };

  useEffect(() => {
    if (activeSubtitle && subtitleData.has(activeSubtitle)) {
      const cues = subtitleData.get(activeSubtitle)!;
      const activeCues = getActiveCues(cues, currentTime);
      setCurrentCues(activeCues);
    } else {
      setCurrentCues([]);
    }
  }, [currentTime, activeSubtitle, subtitleData]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  return (
    <main className="container">
      <h1>Video Player</h1>
      
      {isLoading ? (
        <div className="loading-container">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p className="loading-message">{loadingMessage}</p>
          </div>
        </div>
      ) : videoError ? (
        <div className="error-container">
          <div className="error-content">
            <h3>⚠️ Playback Error</h3>
            <p>{videoError}</p>
            <p className="error-help">
              This video format may not be supported by your browser. 
              Try converting it to MP4 format for better compatibility.
            </p>
            <button onClick={clearVideo} className="error-button">
              Try Another Video
            </button>
          </div>
        </div>
      ) : !videoUrl ? (
        <div
          className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="drop-zone-content">
            <p>Drag and drop video and subtitle files here</p>
            <p>or click to select files</p>
            <p className="supported-formats">
              Videos: MP4, WebM, MKV, MOV, AVI, and more
            </p>
            <p className="supported-formats">
              Subtitles: SRT, VTT, ASS, SSA, SUB
            </p>
            <p className="compatibility-note">
              * Some formats may have limited browser support
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,.mkv,.srt,.vtt,.ass,.ssa,.sub"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      ) : (
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
            onDragOver={handleSubtitleDragOver}
            onDragLeave={handleSubtitleDragLeave}
            onDrop={handleSubtitleDrop}
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
              onChange={handleSubtitleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
          
          <SubtitleControls 
            subtitleTracks={subtitleTracks}
            activeSubtitle={activeSubtitle}
            subtitlePosition={subtitlePosition}
            subtitleSize={subtitleSize}
            onToggleSubtitle={toggleSubtitle}
            onRemoveSubtitle={removeSubtitle}
            onResetPosition={resetPosition}
            onResetSize={resetSize}
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
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={() => {
                  console.log('Video loaded');
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
                onMouseDown={handleSubtitleMouseDown}
                onWheel={handleSubtitleWheel}
              />
            </div>
          </div>
          
          <div className="video-controls">
            <button onClick={togglePlayPause}>
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button onClick={() => setShowSubtitlePanel(!showSubtitlePanel)}>
              Subtitles/CC
            </button>
            <button onClick={clearVideo}>Clear Video</button>
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
              <div className="ytp-panel-menu" role="menu" style={{ height: `${Math.max(97, (subtitleTracks.length + 1) * 48)}px` }}>
                <div 
                  className="ytp-menuitem" 
                  tabIndex={0} 
                  role="menuitemradio" 
                  aria-checked={!activeSubtitle}
                  onClick={() => toggleSubtitle(null)}
                >
                  <div className="ytp-menuitem-label">Off</div>
                </div>
                
                {subtitleTracks.map(track => (
                  <div 
                    key={track.id}
                    className="ytp-menuitem" 
                    tabIndex={0} 
                    role="menuitemradio" 
                    aria-checked={activeSubtitle === track.id}
                    onClick={() => toggleSubtitle(track.id)}
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
        </div>
      )}
    </main>
  );
}

export default App;
