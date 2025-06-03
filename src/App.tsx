import { useState, useRef, useEffect } from "react";
import ReactPlayer from "react-player";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import "./App.css";

function App() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [useVideoJs, setUseVideoJs] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [videoError, setVideoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);

  // Video file extensions that we want to support
  const supportedVideoExtensions = [
    '.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.m4v', '.3gp', '.flv', '.wmv'
  ];

  // Formats that typically work better with Video.js
  const preferVideoJs = ['.mkv', '.avi', '.wmv', '.flv', '.mov'];

  const isVideoFile = (file: File) => {
    // Check MIME type first
    if (file.type.startsWith('video/')) {
      return true;
    }
    
    // Check file extension for files with missing/incorrect MIME types (like MKV)
    const fileName = file.name.toLowerCase();
    return supportedVideoExtensions.some(ext => fileName.endsWith(ext));
  };

  const shouldUseVideoJs = (fileName: string) => {
    const lowerName = fileName.toLowerCase();
    return preferVideoJs.some(ext => lowerName.endsWith(ext));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const setupVideoJs = (url: string) => {
    if (videoRef.current && !playerRef.current) {
      try {
        playerRef.current = videojs(videoRef.current, {
          controls: true,
          responsive: true,
          fluid: true,
          preload: 'metadata',
          autoplay: false, // Disable autoplay to respect browser policies
          sources: [{
            src: url,
            type: 'video/mp4'
          }]
        });

        playerRef.current.ready(() => {
          setIsLoading(false);
          setLoadingMessage("");
          setVideoError(null);
          console.log('Video.js player ready');
        });

        playerRef.current.on('error', (e: any) => {
          console.error('Video.js error:', e);
          setVideoError("Video format not supported by this player");
          setIsLoading(false);
        });

        // Add timeout to prevent hanging
        setTimeout(() => {
          if (playerRef.current && !playerRef.current.readyState()) {
            console.log('Video.js setup timeout, finishing loading');
            setIsLoading(false);
            setLoadingMessage("");
          }
        }, 5000);

      } catch (error) {
        console.error("Video.js setup error:", error);
        setVideoError("Failed to initialize video player");
        setIsLoading(false);
      }
    } else if (playerRef.current) {
      playerRef.current.src({ src: url, type: 'video/mp4' });
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
      
      // Determine which player to use
      const useVjs = shouldUseVideoJs(file.name);
      setUseVideoJs(useVjs);
      
      if (useVjs) {
        setLoadingMessage("Initializing video player...");
        setTimeout(() => setupVideoJs(url), 100);
      } else {
        setIsLoading(false);
        setLoadingMessage("");
      }
      
    } catch (error) {
      console.error("Failed to process video:", error);
      setVideoError("Failed to load video file");
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(file => isVideoFile(file));
    
    if (videoFile) {
      processVideoFile(videoFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isVideoFile(file)) {
      processVideoFile(file);
    }
  };

  const clearVideo = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    
    // Clean up Video.js player
    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }
    
    setVideoUrl(null);
    setFileName("");
    setIsPlaying(false);
    setUseVideoJs(false);
    setIsLoading(false);
    setLoadingMessage("");
    setVideoError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const togglePlayPause = () => {
    if (useVideoJs && playerRef.current) {
      try {
        if (playerRef.current.paused()) {
          playerRef.current.play();
          setIsPlaying(true);
        } else {
          playerRef.current.pause();
          setIsPlaying(false);
        }
      } catch (error) {
        console.error("Playback control error:", error);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  // Handle ReactPlayer errors by falling back to Video.js
  const handleReactPlayerError = (error: any) => {
    console.log('ReactPlayer failed, falling back to Video.js:', error);
    
    // Check if it's an autoplay error
    if (error && error.message && error.message.includes('play method is not allowed')) {
      console.log('Autoplay restriction detected, setting up Video.js without autoplay');
    }
    
    setUseVideoJs(true);
    setIsLoading(true);
    setIsPlaying(false); // Reset playing state
    setLoadingMessage("Trying alternative player...");
    if (videoUrl) {
      setTimeout(() => setupVideoJs(videoUrl), 100);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, []);

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
            <p>Drag and drop a video file here</p>
            <p>or click to select a file</p>
            <p className="supported-formats">
              Supports: MP4, WebM, MKV, MOV, AVI, and more
            </p>
            <p className="compatibility-note">
              * Some formats may have limited browser support
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,.mkv"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      ) : (
        <div className="video-container">
          <div className="video-info">
            <p>Playing: {fileName}</p>
            <p className="player-type">
              {useVideoJs ? 'Using Video.js player' : 'Using ReactPlayer'}
            </p>
            {!isPlaying && (
              <p className="playback-hint">
                📹 Click the play button or use player controls to start
              </p>
            )}
          </div>
          
          {useVideoJs ? (
            <div className="video-js-container">
              <video
                ref={videoRef}
                className="video-js vjs-default-skin"
                data-setup="{}"
              />
            </div>
          ) : (
            <ReactPlayer
              url={videoUrl}
              playing={isPlaying}
              controls={true}
              width="100%"
              height="auto"
              config={{
                file: {
                  attributes: {
                    preload: 'metadata'
                  }
                }
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={handleReactPlayerError}
              onReady={() => console.log('ReactPlayer ready')}
            />
          )}
          
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
