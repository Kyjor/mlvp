import { useState, useRef, useEffect } from "react";
import "./App.css";

interface SubtitleTrack {
  id: string;
  label: string;
  src: string;
  default?: boolean;
}

interface SubtitleCue {
  startTime: number;
  endTime: number;
  text: string;
}

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
  
  // Subtitle customization states
  const [subtitlePosition, setSubtitlePosition] = useState({ x: 50, y: 85 }); // Percentage positions
  const [subtitleSize, setSubtitleSize] = useState(100); // Percentage scale
  const [isDraggingSubtitle, setIsDraggingSubtitle] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [initialSubtitlePos, setInitialSubtitlePos] = useState({ x: 0, y: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subtitleInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null);

  // Video file extensions that we want to support
  const supportedVideoExtensions = [
    '.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.m4v', '.3gp', '.flv', '.wmv'
  ];

  // Subtitle file extensions
  const supportedSubtitleExtensions = [
    '.srt', '.vtt', '.ass', '.ssa', '.sub'
  ];

  const isVideoFile = (file: File) => {
    // Check MIME type first
    if (file.type.startsWith('video/')) {
      return true;
    }
    
    // Check file extension for files with missing/incorrect MIME types (like MKV)
    const fileName = file.name.toLowerCase();
    return supportedVideoExtensions.some(ext => fileName.endsWith(ext));
  };

  const isSubtitleFile = (file: File) => {
    const fileName = file.name.toLowerCase();
    return supportedSubtitleExtensions.some(ext => fileName.endsWith(ext));
  };

  // Convert ASS format to VTT format
  const convertAssToVtt = (assContent: string): string => {
    let vttContent = "WEBVTT\n\n";
    
    const lines = assContent.split('\n');
    let inEventsSection = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if we're in the Events section
      if (trimmedLine === '[Events]') {
        inEventsSection = true;
        continue;
      }
      
      // Stop processing if we hit another section
      if (trimmedLine.startsWith('[') && trimmedLine !== '[Events]') {
        inEventsSection = false;
        continue;
      }
      
      // Process dialogue lines
      if (inEventsSection && trimmedLine.startsWith('Dialogue:')) {
        const parts = trimmedLine.split(',');
        
        if (parts.length >= 10) {
          // ASS format: Dialogue: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
          const startTime = parts[1].trim();
          const endTime = parts[2].trim();
          const text = parts.slice(9).join(',').trim();
          
          // Convert ASS time format (H:MM:SS.CC) to VTT format (HH:MM:SS.CCC)
          const vttStartTime = convertAssTimeToVtt(startTime);
          const vttEndTime = convertAssTimeToVtt(endTime);
          
          // Clean up text (remove ASS formatting tags)
          const cleanText = cleanAssText(text);
          
          if (cleanText) {
            vttContent += `${vttStartTime} --> ${vttEndTime}\n${cleanText}\n\n`;
          }
        }
      }
    }
    
    console.log('Converted ASS to VTT:', vttContent.substring(0, 500) + '...');
    return vttContent;
  };

  // Convert ASS time format to VTT time format
  const convertAssTimeToVtt = (assTime: string): string => {
    // ASS format: H:MM:SS.CC (centiseconds)
    // VTT format: HH:MM:SS.MMM (milliseconds)
    
    const timeParts = assTime.split(':');
    if (timeParts.length !== 3) return assTime;
    
    const hours = timeParts[0].padStart(2, '0');
    const minutes = timeParts[1];
    const secondsParts = timeParts[2].split('.');
    const seconds = secondsParts[0];
    const centiseconds = secondsParts[1] || '00';
    
    // Convert centiseconds to milliseconds
    const milliseconds = (parseInt(centiseconds) * 10).toString().padStart(3, '0');
    
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  };

  // Clean ASS text formatting
  const cleanAssText = (text: string): string => {
    return text
      .replace(/\{[^}]*\}/g, '') // Remove formatting tags like {\an8}
      .replace(/\\N/g, '\n') // Convert line breaks
      .replace(/\\n/g, '\n') // Convert line breaks
      .replace(/\\h/g, ' ') // Convert hard spaces
      .trim();
  };

  // Convert SRT format to VTT format
  const convertSrtToVtt = (srtContent: string): string => {
    let vttContent = "WEBVTT\n\n";
    
    // Clean up the content and split by double newlines
    const cleanContent = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const blocks = cleanContent.split(/\n\s*\n/);
    
    blocks.forEach((block, index) => {
      const lines = block.trim().split('\n');
      if (lines.length >= 3) {
        // Skip the subtitle number (first line)
        const timeLine = lines[1];
        const textLines = lines.slice(2);
        
        // Convert SRT time format (00:00:20,000 --> 00:00:24,400) to VTT format
        const vttTimeLine = timeLine
          .replace(/,/g, '.') // Replace comma with period in timestamps
          .replace(/\s*-->\s*/g, ' --> '); // Ensure proper arrow format
        
        // Add the cue
        vttContent += `${vttTimeLine}\n${textLines.join('\n')}\n\n`;
      }
    });
    
    console.log('Converted SRT to VTT:', vttContent.substring(0, 500) + '...');
    return vttContent;
  };

  // Process subtitle file
  const processSubtitleFile = async (file: File): Promise<SubtitleTrack> => {
    console.log('Processing subtitle file:', file.name);
    const content = await file.text();
    const fileName = file.name;
    const extension = fileName.toLowerCase().split('.').pop();
    
    let vttContent = content;
    
    // Convert non-VTT formats to VTT
    if (extension === 'srt') {
      vttContent = convertSrtToVtt(content);
    } else if (extension === 'ass' || extension === 'ssa') {
      vttContent = convertAssToVtt(content);
    } else if (extension !== 'vtt') {
      // For other formats, try to convert as SRT (basic fallback)
      vttContent = convertSrtToVtt(content);
    }
    
    // Ensure proper VTT header
    if (!vttContent.startsWith('WEBVTT')) {
      vttContent = 'WEBVTT\n\n' + vttContent;
    }
    
    // Parse VTT content into cues for custom rendering
    const cues = parseVttContent(vttContent);
    console.log('Parsed subtitle cues:', cues.length);
    
    const trackId = `subtitle-${Date.now()}-${Math.random()}`;
    
    // Store cues for this track
    setSubtitleData(prev => new Map(prev.set(trackId, cues)));
    
    // Create data URL for fallback (though we won't use native tracks anymore)
    const vttDataUrl = `data:text/vtt;charset=utf-8,${encodeURIComponent(vttContent)}`;
    
    console.log('Created subtitle track with', cues.length, 'cues:', fileName);
    
    return {
      id: trackId,
      label: fileName.replace(/\.[^/.]+$/, ""), // Remove extension
      src: vttDataUrl,
      default: subtitleTracks.length === 0 // First subtitle is default
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

  // Dedicated subtitle drop zone handlers
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
      
      // Auto-activate first subtitle if none are active
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

  // Parse VTT content into subtitle cues
  const parseVttContent = (vttContent: string): SubtitleCue[] => {
    const cues: SubtitleCue[] = [];
    const lines = vttContent.split('\n');
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Skip empty lines and WEBVTT header
      if (!line || line === 'WEBVTT') {
        i++;
        continue;
      }
      
      // Check if this is a timestamp line
      if (line.includes('-->')) {
        const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
        if (timeMatch) {
          const startTime = parseVttTime(timeMatch[1]);
          const endTime = parseVttTime(timeMatch[2]);
          
          // Collect text lines until we hit an empty line or end of file
          const textLines: string[] = [];
          i++;
          while (i < lines.length && lines[i].trim() !== '') {
            textLines.push(lines[i].trim());
            i++;
          }
          
          if (textLines.length > 0) {
            cues.push({
              startTime,
              endTime,
              text: textLines.join('\n')
            });
          }
        }
      }
      i++;
    }
    
    return cues;
  };

  // Parse VTT time format to seconds
  const parseVttTime = (timeStr: string): number => {
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const secondsParts = parts[2].split('.');
    const seconds = parseInt(secondsParts[0]);
    const milliseconds = parseInt(secondsParts[1]);
    
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  };

  // Get active cues for current time
  const getActiveCues = (cues: SubtitleCue[], currentTime: number): SubtitleCue[] => {
    return cues.filter(cue => 
      currentTime >= cue.startTime && currentTime <= cue.endTime
    );
  };

  // Update current cues based on video time and active subtitle
  useEffect(() => {
    if (activeSubtitle && subtitleData.has(activeSubtitle)) {
      const cues = subtitleData.get(activeSubtitle)!;
      const activeCues = getActiveCues(cues, currentTime);
      setCurrentCues(activeCues);
    } else {
      setCurrentCues([]);
    }
  }, [currentTime, activeSubtitle, subtitleData]);

  // Handle video time updates
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Subtitle interaction handlers
  const handleSubtitleMouseDown = (e: React.MouseEvent) => {
    if (subtitleRef.current && videoWrapperRef.current) {
      e.preventDefault();
      setIsDraggingSubtitle(true);
      setDragStartPos({ x: e.clientX, y: e.clientY });
      setInitialSubtitlePos({ x: subtitlePosition.x, y: subtitlePosition.y });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDraggingSubtitle && videoWrapperRef.current) {
      const deltaX = e.clientX - dragStartPos.x;
      const deltaY = e.clientY - dragStartPos.y;
      
      // Check if Control key is held for position moving
      if (e.ctrlKey) {
        // Position movement (existing behavior)
        const rect = videoWrapperRef.current.getBoundingClientRect();
        const deltaXPercent = (deltaX / rect.width) * 100;
        const deltaYPercent = (deltaY / rect.height) * 100;
        
        const newX = Math.max(0, Math.min(100, initialSubtitlePos.x + deltaXPercent));
        const newY = Math.max(0, Math.min(100, initialSubtitlePos.y + deltaYPercent));
        
        setSubtitlePosition({ x: newX, y: newY });
      } else {
        // Size adjustment based on drag direction
        // Up/Right = bigger, Down/Left = smaller
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const direction = deltaX + (-deltaY); // Up and Right are positive
        
        // Scale factor based on distance and direction
        const scaleFactor = distance * 0.2; // Adjust sensitivity
        const sizeChange = direction > 0 ? scaleFactor : -scaleFactor;
        
        // Apply size change from initial size (100%)
        const newSize = Math.max(50, Math.min(200, 100 + sizeChange));
        setSubtitleSize(newSize);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDraggingSubtitle(false);
  };

  const handleSubtitleWheel = (e: React.WheelEvent) => {
    // Only resize if Control key is held
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = -e.deltaY; // Invert for natural scroll behavior
      const sizeChange = delta > 0 ? 5 : -5;
      const newSize = Math.max(50, Math.min(200, subtitleSize + sizeChange));
      setSubtitleSize(newSize);
    }
  };

  // Event listeners for mouse movement and release
  useEffect(() => {
    if (isDraggingSubtitle) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingSubtitle, dragStartPos, initialSubtitlePos]);

  // Cleanup on unmount
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
          
          {/* Dedicated Subtitle Drop Zone */}
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
          
          {subtitleTracks.length > 0 && (
            <div className="subtitle-controls">
              <div className="subtitle-selector">
                <label>Subtitles:</label>
                <select 
                  value={activeSubtitle || ''} 
                  onChange={(e) => toggleSubtitle(e.target.value || null)}
                >
                  <option value="">Off</option>
                  {subtitleTracks.map(track => (
                    <option key={track.id} value={track.id}>
                      {track.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Subtitle customization panel */}
              {activeSubtitle && (
                <div className="subtitle-customization">
                  <div className="customization-header">
                    <span>📐 Subtitle Position & Size</span>
                  </div>
                  <div className="customization-controls">
                    <div className="control-group">
                      <label>Position: {subtitlePosition.x.toFixed(0)}%, {subtitlePosition.y.toFixed(0)}%</label>
                      <button 
                        className="reset-btn"
                        onClick={() => setSubtitlePosition({ x: 50, y: 85 })}
                        title="Reset position to center bottom"
                      >
                        Reset Position
                      </button>
                    </div>
                    <div className="control-group">
                      <label>Size: {subtitleSize}%</label>
                      <button 
                        className="reset-btn"
                        onClick={() => setSubtitleSize(100)}
                        title="Reset size to 100%"
                      >
                        Reset Size
                      </button>
                    </div>
                  </div>
                  <div className="control-instructions">
                    <p>💡 <strong>Drag Up/Right</strong> to make subtitles bigger</p>
                    <p>💡 <strong>Drag Down/Left</strong> to make subtitles smaller</p>
                    <p>💡 <strong>Ctrl + Drag</strong> to move subtitles</p>
                    <p>💡 <strong>Ctrl + Scroll</strong> to resize precisely</p>
                  </div>
                </div>
              )}
              
              <div className="subtitle-list">
                {subtitleTracks.map(track => (
                  <div key={track.id} className="subtitle-item">
                    <span className="subtitle-name">{track.label}</span>
                    <button 
                      onClick={() => removeSubtitle(track.id)}
                      className="remove-subtitle"
                      title="Remove subtitle"
                    >
                      ❌
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
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
              
              {/* YouTube-style subtitle overlay */}
              {currentCues.length > 0 && (
                <div 
                  className="subtitle-overlay-container"
                  style={{
                    position: 'absolute',
                    left: `${subtitlePosition.x}%`,
                    top: `${subtitlePosition.y}%`,
                    transform: 'translate(-50%, -50%)',
                    cursor: isDraggingSubtitle ? 'grabbing' : 'grab',
                    userSelect: 'none'
                  }}
                  ref={subtitleRef}
                  onMouseDown={handleSubtitleMouseDown}
                  onWheel={handleSubtitleWheel}
                >
                  <div className="subtitle-window">
                    <div 
                      className="subtitle-content"
                      style={{
                        transform: `scale(${subtitleSize / 100})`,
                        transformOrigin: 'center center'
                      }}
                    >
                      {currentCues.map((cue, index) => (
                        <div key={index} className="subtitle-line">
                          {cue.text.split('\n').map((line, lineIndex) => (
                            <span key={lineIndex} className="subtitle-segment">
                              {line}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Visual feedback for control hints */}
                  {isDraggingSubtitle && (
                    <div className="subtitle-drag-hint">
                      Dragging subtitle...
                    </div>
                  )}
                </div>
              )}
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
          
          {/* YouTube-style Subtitle Panel */}
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
                {/* Off option */}
                <div 
                  className="ytp-menuitem" 
                  tabIndex={0} 
                  role="menuitemradio" 
                  aria-checked={!activeSubtitle}
                  onClick={() => toggleSubtitle(null)}
                >
                  <div className="ytp-menuitem-label">Off</div>
                </div>
                
                {/* Subtitle track options */}
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
