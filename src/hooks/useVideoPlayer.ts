import { useState, useRef, useCallback } from 'react';

export const useVideoPlayer = () => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [videoError, setVideoError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(err => {
          console.error("Error playing video:", err);
          setVideoError("Failed to play video. " + err.message);
        });
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const processVideoFile = useCallback(async (file: File, initialTime?: number) => {
    setVideoError(null);
    try {
      // Revoke previous object URL if it exists
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setFileName(file.name);
      setIsPlaying(false); 
      setCurrentTime(initialTime || 0); // Set initial time or 0

      if (videoRef.current) {
        videoRef.current.currentTime = initialTime || 0; // Seek to initial time
        // Autoplay is not set here, user will need to press play
      }
      
    } catch (error) {
      console.error("Failed to process video:", error);
      setVideoError("Failed to load video file.");
    }
  }, [videoUrl]); // Added videoUrl to dependencies to revoke old URL

  const resetVideoState = useCallback(() => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoUrl(null);
    setFileName("");
    setIsPlaying(false);
    setVideoError(null);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.src = ""; // Clear the src attribute
      videoRef.current.load(); // Reset the media element
    }
  }, [videoUrl]);

  return {
    videoUrl,
    setVideoUrl,
    isPlaying,
    setIsPlaying,
    fileName,
    setFileName,
    videoError,
    setVideoError,
    currentTime,
    setCurrentTime,
    videoRef,
    togglePlayPause,
    handleTimeUpdate,
    processVideoFile,
    resetVideoState
  };
}; 