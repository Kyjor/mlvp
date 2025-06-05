import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { isYouTubeUrl, extractYouTubeVideoId, getYouTubeVideoTitle } from '../utils/fileUtils';

export const useVideoPlayer = () => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [videoError, setVideoError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isYouTube, setIsYouTube] = useState(false);
  const [youTubeVideoId, setYouTubeVideoId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // State to manage the initial time we want to seek to
  const [pendingInitialTime, setPendingInitialTime] = useState<number | null>(null);
  // Ref to keep track of the current object URL for proper revocation
  const videoUrlObjectRef = useRef<string | null>(null);

  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(err => {
          console.error("[VideoPlayer] Error playing video:", err);
          setVideoError("Failed to play video. " + err.message);
        });
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback((time?: number) => {
    if (time !== undefined) {
      // Time passed from Video.js player
      setCurrentTime(time);
    } else if (videoRef.current) {
      // Fallback to reading from video element directly
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const processVideoFile = useCallback(async (file: File, initialTime?: number) => {
    console.log(`[VideoPlayer] processVideoFile called. File: ${file.name}, initialTime: ${initialTime}`);
    setVideoError(null);
    setIsYouTube(false);
    setYouTubeVideoId(null);
    
    try {
      // Revoke previous object URL if it exists
      if (videoUrlObjectRef.current) {
        URL.revokeObjectURL(videoUrlObjectRef.current);
        console.log("[VideoPlayer] Revoked old object URL:", videoUrlObjectRef.current);
      }

      const newUrl = URL.createObjectURL(file);
      videoUrlObjectRef.current = newUrl; // Store new URL for future revocation
      console.log("[VideoPlayer] Created new object URL:", newUrl);

      setVideoUrl(newUrl); // This will trigger the useEffect for seeking
      setFileName(file.name);
      setIsPlaying(false);
      // Set currentTime state immediately for UI responsiveness
      setCurrentTime(initialTime ?? 0); 
      console.log(`[VideoPlayer] Set React currentTime state to: ${initialTime ?? 0}`);
      // Signal the useEffect to act with the initialTime
      setPendingInitialTime(initialTime ?? null); 
      console.log(`[VideoPlayer] Set pendingInitialTime to: ${initialTime ?? null}`);

    } catch (error) {
      console.error("[VideoPlayer] Failed to process video:", error);
      setVideoError("Failed to load video file.");
    }
  }, []); // No dependencies, uses refs and setters

  const processVideo = useCallback(async (source: File | string, initialTime?: number) => {
    console.log(`[VideoPlayer] processVideo called. Source:`, source, `initialTime: ${initialTime}`);
    setVideoError(null);
    
    try {
      if (source instanceof File) {
        // Handle file upload
        setIsYouTube(false);
        setYouTubeVideoId(null);
        
        // Revoke previous object URL if it exists
        if (videoUrlObjectRef.current) {
          URL.revokeObjectURL(videoUrlObjectRef.current);
          console.log("[VideoPlayer] Revoked old object URL:", videoUrlObjectRef.current);
        }

        const newUrl = URL.createObjectURL(source);
        videoUrlObjectRef.current = newUrl; // Store new URL for future revocation
        console.log("[VideoPlayer] Created new object URL:", newUrl);

        setVideoUrl(newUrl);
        setFileName(source.name);
      } else {
        // Handle URL (YouTube)
        if (!isYouTubeUrl(source)) {
          throw new Error("Unsupported URL format. Please use a YouTube URL.");
        }

        const videoId = extractYouTubeVideoId(source);
        if (!videoId) {
          throw new Error("Invalid YouTube URL");
        }

        // Revoke previous object URL if it exists
        if (videoUrlObjectRef.current) {
          URL.revokeObjectURL(videoUrlObjectRef.current);
          console.log("[VideoPlayer] Revoked old object URL:", videoUrlObjectRef.current);
          videoUrlObjectRef.current = null;
        }

        const title = await getYouTubeVideoTitle(videoId);
        
        setVideoUrl(source); // Use the original YouTube URL
        setFileName(title);
        setIsYouTube(true);
        setYouTubeVideoId(videoId);
      }
      
      setIsPlaying(false);
      // Set currentTime state immediately for UI responsiveness
      setCurrentTime(initialTime ?? 0); 
      console.log(`[VideoPlayer] Set React currentTime state to: ${initialTime ?? 0}`);
      // Signal the useEffect to act with the initialTime
      setPendingInitialTime(initialTime ?? null); 
      console.log(`[VideoPlayer] Set pendingInitialTime to: ${initialTime ?? null}`);

    } catch (error) {
      console.error("[VideoPlayer] Failed to process video:", error);
      setVideoError(error instanceof Error ? error.message : "Failed to load video.");
    }
  }, []);

  // Effect to handle seeking when videoUrl or pendingInitialTime changes
  // NOTE: This is now handled by Video.js player, but keeping for fallback
  useLayoutEffect(() => {
    // Skip this for Video.js - let Video.js handle the seeking
    if (pendingInitialTime !== null) {
      console.log("[VideoPlayer] Seek useLayoutEffect: Skipping - Video.js will handle initial time");
      return;
    }
    
    const video = videoRef.current;
    if (!video || !videoUrl || typeof pendingInitialTime !== 'number') {
      console.log("[VideoPlayer] Seek useLayoutEffect: Skipping (conditions: !video:", !video, ", !videoUrl:", !videoUrl, ", typeof pendingInitialTime !== 'number':", typeof pendingInitialTime !== 'number', ", pendingInitialTime:", pendingInitialTime);
      return;
    }

    console.log(`[VideoPlayer] Seek useLayoutEffect: Active. videoUrl: ${videoUrl}, pendingInitialTime: ${pendingInitialTime}, readyState: ${video.readyState}`);

    let didUnmount = false;

    const performActualSeek = () => {
      if (didUnmount || !video || typeof pendingInitialTime !== 'number') return;
      console.log(`[VideoPlayer] Loaded metadata or already ready. Attempting to set video.currentTime to ${pendingInitialTime}. Current: ${video.currentTime}`);
      video.currentTime = pendingInitialTime;
    };

    const afterActualSeek = () => {
      if (didUnmount || !video) return;
      console.log(`[VideoPlayer] Seeked event fired. Actual video.currentTime: ${video.currentTime}. Updating React state.`);
      setCurrentTime(video.currentTime); // Sync React state with actual video time
      setPendingInitialTime(null);     // Clear the pending request
    };
    
    // Ensure the video element's src attribute is up-to-date.
    // React should handle this, but this effect runs after the DOM update.
    if (video.getAttribute('src') !== videoUrl) {
        console.warn(`[VideoPlayer] video.getAttribute('src') (${video.getAttribute('src')}) !== videoUrl (${videoUrl}). This might indicate a delay in DOM update. Relying on loadedmetadata for new source.`);
        // If src is not yet updated on the element, we MUST wait for loadedmetadata.
         video.addEventListener('loadedmetadata', performActualSeek, { once: true });
    } else if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
      console.log(`[VideoPlayer] Metadata not ready (readyState: ${video.readyState}), adding loadedmetadata listener.`);
      video.addEventListener('loadedmetadata', performActualSeek, { once: true });
    } else {
      // Metadata is already loaded, and src is assumed to be correct.
      console.log(`[VideoPlayer] Metadata ready (readyState: ${video.readyState}), seeking directly.`);
      performActualSeek();
    }

    // Always listen for 'seeked' to finalize the process and update state.
    video.addEventListener('seeked', afterActualSeek, { once: true });

    return () => {
      didUnmount = true;
      console.log("[VideoPlayer] Seek useLayoutEffect: Cleanup listeners.");
      if (video) {
        video.removeEventListener('loadedmetadata', performActualSeek);
        video.removeEventListener('seeked', afterActualSeek);
      }
    };
  }, [videoUrl, pendingInitialTime, videoRef]); // videoRef included in case the element instance changes

  // Additional effect to handle case where video element becomes available after conditional rendering
  // NOTE: This is now handled by Video.js player, but keeping for fallback
  useEffect(() => {
    // Skip this for Video.js - let Video.js handle the seeking
    if (pendingInitialTime !== null) {
      console.log("[VideoPlayer] Backup seek useEffect: Skipping - Video.js will handle initial time");
      return;
    }
    
    const video = videoRef.current;
    if (!video || !videoUrl || typeof pendingInitialTime !== 'number') {
      return;
    }

    console.log(`[VideoPlayer] Backup seek useEffect: Video element now available. videoUrl: ${videoUrl}, pendingInitialTime: ${pendingInitialTime}, readyState: ${video.readyState}`);

    let didUnmount = false;

    const performActualSeek = () => {
      if (didUnmount || !video || typeof pendingInitialTime !== 'number') return;
      console.log(`[VideoPlayer] Backup seek: Loaded metadata or already ready. Attempting to set video.currentTime to ${pendingInitialTime}. Current: ${video.currentTime}`);
      video.currentTime = pendingInitialTime;
    };

    const afterActualSeek = () => {
      if (didUnmount || !video) return;
      console.log(`[VideoPlayer] Backup seek: Seeked event fired. Actual video.currentTime: ${video.currentTime}. Updating React state.`);
      setCurrentTime(video.currentTime); // Sync React state with actual video time
      setPendingInitialTime(null);     // Clear the pending request
    };
    
    // Check if video src matches videoUrl
    if (video.getAttribute('src') !== videoUrl) {
        console.warn(`[VideoPlayer] Backup seek: video.getAttribute('src') (${video.getAttribute('src')}) !== videoUrl (${videoUrl}). Waiting for loadedmetadata.`);
        video.addEventListener('loadedmetadata', performActualSeek, { once: true });
    } else if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
      console.log(`[VideoPlayer] Backup seek: Metadata not ready (readyState: ${video.readyState}), adding loadedmetadata listener.`);
      video.addEventListener('loadedmetadata', performActualSeek, { once: true });
    } else {
      console.log(`[VideoPlayer] Backup seek: Metadata ready (readyState: ${video.readyState}), seeking directly.`);
      performActualSeek();
    }

    // Always listen for 'seeked' to finalize the process and update state.
    video.addEventListener('seeked', afterActualSeek, { once: true });

    return () => {
      didUnmount = true;
      console.log("[VideoPlayer] Backup seek useEffect: Cleanup listeners.");
      if (video) {
        video.removeEventListener('loadedmetadata', performActualSeek);
        video.removeEventListener('seeked', afterActualSeek);
      }
    };
  }, [videoRef.current, videoUrl, pendingInitialTime]); // Specifically watch for videoRef.current to become available

  const resetVideoState = useCallback(() => {
    console.log("[VideoPlayer] resetVideoState called.");
    if (videoUrlObjectRef.current) { 
      URL.revokeObjectURL(videoUrlObjectRef.current);
      console.log("[VideoPlayer] Revoked object URL in resetVideoState:", videoUrlObjectRef.current);
      videoUrlObjectRef.current = null;
    }
    setVideoUrl(null);
    setFileName("");
    setIsPlaying(false);
    setVideoError(null);
    setCurrentTime(0);
    setIsYouTube(false);
    setYouTubeVideoId(null);
    setPendingInitialTime(null); // Also reset pending time
    if (videoRef.current) {
      videoRef.current.src = ""; 
      videoRef.current.load(); 
      console.log("[VideoPlayer] Cleared video src and called load() in resetVideoState.");
    }
  }, []); // No dependencies needed if using ref and setters

  // Effect for cleaning up the object URL on unmount
  useEffect(() => {
    return () => {
      if (videoUrlObjectRef.current) {
        URL.revokeObjectURL(videoUrlObjectRef.current);
        console.log("[VideoPlayer] Revoked object URL on unmount:", videoUrlObjectRef.current);
        videoUrlObjectRef.current = null;
      }
    };
  }, []); // Empty dependency array means run on mount/unmount

  const clearPendingInitialTime = useCallback(() => {
    console.log("[VideoPlayer] Clearing pendingInitialTime");
    setPendingInitialTime(null);
  }, []);

  // Seek to a specific time - works with Video.js player
  const seekToTime = useCallback((time: number) => {
    console.log(`[VideoPlayer] seekToTime called: ${time}s`);
    
    // For Video.js, we need to access the player instance through the video element
    // The VideoJSPlayer component handles the actual Video.js instance
    if (videoRef.current) {
      // Check if this is a Video.js player
      const videoElement = videoRef.current;
      if ((videoElement as any).player) {
        // This is a Video.js player
        const player = (videoElement as any).player;
        console.log(`[VideoPlayer] Seeking Video.js player to ${time}s`);
        player.currentTime(time);
      } else if (videoElement.currentTime !== undefined) {
        // Fallback for regular HTML5 video
        console.log(`[VideoPlayer] Seeking HTML5 video to ${time}s`);
        videoElement.currentTime = time;
      }
      
      // Update our state immediately for UI responsiveness
      setCurrentTime(time);
    }
  }, []);

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
    pendingInitialTime,
    isYouTube,
    youTubeVideoId,
    videoRef,
    togglePlayPause,
    handleTimeUpdate,
    processVideoFile,
    processVideo,
    resetVideoState,
    clearPendingInitialTime,
    seekToTime
  };
}; 