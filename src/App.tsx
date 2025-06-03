import { useState, useRef, useEffect } from "react";
import "./App.css";

interface SubtitleTrack {
  id: string;
  label: string;
  src: string;
  default?: boolean;
}

function App() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [videoError, setVideoError] = useState<string | null>(null);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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
    
    // Create data URL instead of blob URL to avoid CORS issues
    const vttDataUrl = `data:text/vtt;charset=utf-8,${encodeURIComponent(vttContent)}`;
    
    console.log('Created subtitle track with data URL:', fileName);
    
    return {
      id: `subtitle-${Date.now()}-${Math.random()}`,
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
      
      // Update video element with new tracks
      setTimeout(() => updateVideoTracks(), 100);
      
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
      
      // Update video element with existing tracks
      setTimeout(() => updateVideoTracks(), 500);
      
    } catch (error) {
      console.error("Failed to process video:", error);
      setVideoError("Failed to load video file");
      setIsLoading(false);
    }
  };

  const updateVideoTracks = () => {
    const video = videoRef.current;
    if (!video) {
      console.log('No video element available for tracks');
      return;
    }
    
    console.log('Updating video tracks:', subtitleTracks.length);
    
    // Remove existing tracks
    const existingTracks = video.querySelectorAll('track');
    existingTracks.forEach(track => track.remove());
    
    // Add subtitle tracks
    subtitleTracks.forEach((track, index) => {
      const trackElement = document.createElement('track');
      trackElement.kind = 'subtitles';
      trackElement.src = track.src;
      trackElement.srclang = 'en';
      trackElement.label = track.label;
      trackElement.default = track.id === activeSubtitle;
      
      video.appendChild(trackElement);
      console.log('Added track to video:', track.label);
    });
    
    // Enable the active track
    if (activeSubtitle) {
      setTimeout(() => {
        const textTracks = video.textTracks;
        for (let i = 0; i < textTracks.length; i++) {
          const track = textTracks[i];
          const subtitleTrack = subtitleTracks.find(t => t.label === track.label);
          track.mode = subtitleTrack?.id === activeSubtitle ? 'showing' : 'disabled';
        }
        console.log('Updated track modes');
      }, 200);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeSubtitle = (trackId: string) => {
    setSubtitleTracks(prev => prev.filter(track => track.id !== trackId));
    
    if (activeSubtitle === trackId) {
      const remainingTracks = subtitleTracks.filter(track => track.id !== trackId);
      setActiveSubtitle(remainingTracks.length > 0 ? remainingTracks[0].id : null);
    }
    
    // Update video tracks
    setTimeout(() => updateVideoTracks(), 100);
  };

  const toggleSubtitle = (trackId: string | null) => {
    setActiveSubtitle(trackId);
    // Update video tracks
    setTimeout(() => updateVideoTracks(), 100);
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

  // Update video tracks when activeSubtitle changes
  useEffect(() => {
    if (videoUrl && subtitleTracks.length > 0) {
      updateVideoTracks();
    }
  }, [activeSubtitle]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
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
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              width="100%"
              height="auto"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onLoadedMetadata={() => {
                console.log('Video loaded, updating tracks');
                setTimeout(() => updateVideoTracks(), 500);
              }}
              crossOrigin="anonymous"
            >
              Your browser does not support the video tag.
            </video>
          </div>
          
          <div className="video-controls">
            <button onClick={togglePlayPause}>
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button onClick={clearVideo}>Clear Video</button>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
