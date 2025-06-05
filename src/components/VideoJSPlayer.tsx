import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

interface VideoJSPlayerProps {
  src: string;
  fileName?: string;
  initialTime?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onLoadedMetadata?: () => void;
  onSeeked?: () => void;
  onInitialTimeHandled?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const VideoJSPlayer = forwardRef<HTMLVideoElement, VideoJSPlayerProps>(({
  src,
  fileName,
  initialTime,
  onPlay,
  onPause,
  onTimeUpdate,
  onLoadedMetadata,
  onSeeked,
  onInitialTimeHandled,
  className,
  style
}, ref) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ReturnType<typeof videojs> | null>(null);

  // Helper function to determine video type
  const getVideoType = (videoSrc: string, fileName?: string): string => {
    const sourceToCheck = fileName || videoSrc;
    
    if (sourceToCheck.includes('.mp4') || sourceToCheck.includes('mp4')) return 'video/mp4';
    if (sourceToCheck.includes('.webm') || sourceToCheck.includes('webm')) return 'video/webm';
    if (sourceToCheck.includes('.ogg') || sourceToCheck.includes('ogg')) return 'video/ogg';
    if (sourceToCheck.includes('.mov') || sourceToCheck.includes('mov')) return 'video/quicktime';
    if (sourceToCheck.includes('.avi') || sourceToCheck.includes('avi')) return 'video/x-msvideo';
    if (sourceToCheck.includes('.mkv') || sourceToCheck.includes('mkv')) return 'video/x-matroska';
    return 'video/mp4';
  };

  // Expose the video element through the forwarded ref
  useImperativeHandle(ref, () => {
    if (playerRef.current && !playerRef.current.isDisposed()) {
      const playerEl = playerRef.current.el();
      if (playerEl) {
        const videoElement = playerEl.querySelector('video') as HTMLVideoElement;
        if (videoElement) {
          console.log('[VideoJSPlayer] Forwarding video element:', videoElement);
          console.log('[VideoJSPlayer] Video element src:', videoElement.src);
          console.log('[VideoJSPlayer] Video element ready state:', videoElement.readyState);
          
          // Attach the Video.js player instance to the video element for seeking
          (videoElement as any).player = playerRef.current;
          
          return videoElement;
        } else {
          console.log('[VideoJSPlayer] Video element not found in player');
        }
      } else {
        console.log('[VideoJSPlayer] Player element not found');
      }
    } else {
      console.log('[VideoJSPlayer] Player not available or disposed');
    }
    console.log('[VideoJSPlayer] No video element found for ref forwarding');
    return null as any;
  }, [playerRef.current, src]);

  // Initialize player once
  useEffect(() => {
    console.log('[VideoJSPlayer] Initializing player');
    
    if (!videoRef.current) {
      console.log('[VideoJSPlayer] No video ref, skipping');
      return;
    }

    // Make sure Video.js player is only initialized once
    if (!playerRef.current) {
      console.log('[VideoJSPlayer] Creating new player');
      
      // The Video.js player needs to be _inside_ the component el for React 18 Strict Mode
      const videoElement = document.createElement("video-js");
      videoElement.classList.add('vjs-big-play-centered');
      videoRef.current.appendChild(videoElement);

      const videoType = getVideoType(src, fileName);
      
      const options = {
        controls: true,
        responsive: true,
        fluid: true,
        aspectRatio: '16:9',
        preload: 'metadata',
        autoplay: false,
        playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2],
        sources: [{
          src: src,
          type: videoType
        }]
      };

      const player = playerRef.current = videojs(videoElement, options, () => {
        console.log('[VideoJSPlayer] Player is ready');
        
        // Handle initial time seeking if provided
        if (initialTime && initialTime > 0) {
          console.log(`[VideoJSPlayer] Seeking to initial time: ${initialTime}`);
          player.ready(() => {
            player.currentTime(initialTime);
            onTimeUpdate?.(initialTime);
            console.log(`[VideoJSPlayer] Seeked to: ${initialTime}`);
            onInitialTimeHandled?.();
          });
        }
        
        // Set up event listeners
        player.on('play', () => {
          console.log('[VideoJSPlayer] PLAY EVENT');
          onPlay?.();
        });

        player.on('pause', () => {
          console.log('[VideoJSPlayer] PAUSE EVENT');
          onPause?.();
        });

        player.on('timeupdate', () => {
          const currentTime = player.currentTime() || 0;
          // console.log('[VideoJSPlayer] TimeUpdate:', currentTime.toFixed(2));
          onTimeUpdate?.(currentTime);
        });

        player.on('loadedmetadata', () => {
          console.log('[VideoJSPlayer] METADATA LOADED');
          onLoadedMetadata?.();
        });

        player.on('seeked', () => {
          // Immediate time update after seeking
          const currentTime = player.currentTime() || 0;
          onTimeUpdate?.(currentTime);
          onSeeked?.();
        });

        player.on('error', (e: any) => {
          console.error('[VideoJSPlayer] ERROR:', e, player.error());
        });

        // Additional time tracking for better subtitle sync
        let timeUpdateInterval: number;
        
        player.on('play', () => {
          // Create a more frequent time update for better subtitle sync
          timeUpdateInterval = setInterval(() => {
            if (!player.paused() && !player.isDisposed()) {
              const currentTime = player.currentTime() || 0;
              // console.log('[VideoJSPlayer] Interval TimeUpdate:', currentTime.toFixed(2));
              onTimeUpdate?.(currentTime);
            }
          }, 100); // Update every 100ms for smooth subtitle sync
        });

        player.on('pause', () => {
          if (timeUpdateInterval) {
            clearInterval(timeUpdateInterval);
          }
        });

        player.on('seeked', () => {
          // Immediate time update after seeking
          const currentTime = player.currentTime() || 0;
          onTimeUpdate?.(currentTime);
          onSeeked?.();
        });

        // Clean up interval on disposal
        player.on('dispose', () => {
          if (timeUpdateInterval) {
            clearInterval(timeUpdateInterval);
          }
        });
      });

    } else {
      // Update existing player with new source
      console.log('[VideoJSPlayer] Updating existing player source');
      const player = playerRef.current;
      const videoType = getVideoType(src, fileName);
      
      player.src([{
        src: src,
        type: videoType
      }]);
    }
  }, [src, fileName]);

  // Dispose the Video.js player when the component unmounts
  useEffect(() => {
    const player = playerRef.current;

    return () => {
      console.log('[VideoJSPlayer] Cleanup - disposing player');
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      data-vjs-player
      className="video-js-container"
      style={{ 
        width: '100%',
        height: 'auto',
        aspectRatio: '16/9',
        backgroundColor: '#000',
        position: 'relative',
        ...style 
      }}
    >
      <div ref={videoRef} />
    </div>
  );
}); 