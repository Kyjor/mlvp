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

  const processVideoFile = useCallback(async (file: File) => {
    setVideoError(null);
    try {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setFileName(file.name);
      setIsPlaying(false); // Don't autoplay new video
      setCurrentTime(0);
    } catch (error) {
      console.error("Failed to process video:", error);
      setVideoError("Failed to load video file.");
    }
  }, []);

  const resetVideoState = useCallback(() => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoUrl(null);
    setFileName("");
    setIsPlaying(false);
    setVideoError(null);
    setCurrentTime(0);
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