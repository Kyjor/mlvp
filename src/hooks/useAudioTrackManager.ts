import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioTrack } from '../types';

interface UseAudioTrackManagerProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  initialActiveTrackId?: string;
}

export const useAudioTrackManager = ({
  videoRef,
  initialActiveTrackId
}: UseAudioTrackManagerProps) => {
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState<string | null>(
    initialActiveTrackId || null
  );
  const [isSupported, setIsSupported] = useState(false);
  const lastVideoSrcRef = useRef<string | null>(null);

  // Debug the videoRef
  useEffect(() => {
    console.log('[AudioTrackManager] Hook initialized');
    console.log('[AudioTrackManager] videoRef object:', videoRef);
    console.log('[AudioTrackManager] videoRef.current:', videoRef.current);
    console.log('[AudioTrackManager] initialActiveTrackId:', initialActiveTrackId);
  }, []);

  // Monitor videoRef changes
  useEffect(() => {
    console.log('[AudioTrackManager] videoRef.current changed:', videoRef.current);
    if (videoRef.current) {
      console.log('[AudioTrackManager] Video element properties:', {
        tagName: videoRef.current.tagName,
        src: videoRef.current.src,
        readyState: videoRef.current.readyState,
        player: (videoRef.current as any).player
      });
    }
  }, [videoRef.current]);

  // Detect available audio tracks from Video.js player
  const detectAudioTracks = useCallback(async () => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      console.log('[AudioTrackManager] No video element available');
      return;
    }

    // Check if this is a Video.js player
    const player = (videoElement as any).player;
    if (!player || player.isDisposed()) {
      console.log('[AudioTrackManager] No Video.js player available or player is disposed');
      return;
    }

    try {
      // Wait for player to be ready
      player.ready(() => {
        console.log('[AudioTrackManager] Player ready, checking for audio tracks');
        console.log('[AudioTrackManager] Player ready state:', player.readyState());
        
        // Get audio tracks from Video.js
        const audioTrackList = player.audioTracks();
        
        console.log('[AudioTrackManager] Raw audioTrackList:', audioTrackList);
        console.log('[AudioTrackManager] audioTrackList length:', audioTrackList ? audioTrackList.length : 'null');
        
        // Check other Video.js methods and properties
        console.log('[AudioTrackManager] Additional Video.js properties:');
        console.log('[AudioTrackManager] - player.tech():', player.tech());
        console.log('[AudioTrackManager] - player.tech().audioTracks():', player.tech()?.audioTracks?.());
        console.log('[AudioTrackManager] - player.audioTrackMenu:', (player as any).audioTrackMenu);
        console.log('[AudioTrackManager] - player.selectableAudioTracks:', (player as any).selectableAudioTracks);
        
        // Check if there are any tracks in the tech layer
        const tech = player.tech();
        if (tech) {
          console.log('[AudioTrackManager] Tech layer properties:');
          console.log('[AudioTrackManager] - tech.featuresNativeAudioTracks:', (tech as any).featuresNativeAudioTracks);
          console.log('[AudioTrackManager] - tech.audioTracks:', (tech as any).audioTracks);
          console.log('[AudioTrackManager] - tech.el():', tech.el());
          
          if (tech.el()) {
            const techEl = tech.el();
            console.log('[AudioTrackManager] Tech element:', techEl);
            console.log('[AudioTrackManager] - tech element audioTracks:', (techEl as any).audioTracks);
          }
        }
        
        if (!audioTrackList) {
          console.log('[AudioTrackManager] No audio track list available from Video.js');
          
          // Try fallback with HTML5 video element
          if (videoElement && (videoElement as any).audioTracks) {
            console.log('[AudioTrackManager] Trying HTML5 audioTracks fallback');
            const htmlAudioTracks = (videoElement as any).audioTracks;
            console.log('[AudioTrackManager] HTML5 audioTracks length:', htmlAudioTracks.length);
            
            if (htmlAudioTracks.length > 0) {
              const tracks: AudioTrack[] = [];
              for (let i = 0; i < htmlAudioTracks.length; i++) {
                const track = htmlAudioTracks[i];
                console.log(`[AudioTrackManager] HTML5 Track ${i}:`, {
                  id: track.id,
                  label: track.label,
                  language: track.language,
                  enabled: track.enabled,
                  kind: track.kind
                });
                
                tracks.push({
                  id: track.id || `html5-track-${i}`,
                  label: track.label || `Audio Track ${i + 1}`,
                  language: track.language || undefined,
                  enabled: track.enabled,
                  kind: track.kind || 'main'
                });
              }
              
              console.log('[AudioTrackManager] HTML5 fallback tracks:', tracks);
              setAudioTracks(tracks);
              setIsSupported(tracks.length > 1);
              return;
            }
          }
          
          setAudioTracks([]);
          setIsSupported(false);
          return;
        }

        console.log('[AudioTrackManager] Audio track list found with length:', audioTrackList.length);
        
        // Check HTML5 video element directly for comparison
        if (videoElement) {
          console.log('[AudioTrackManager] Checking HTML5 video element directly:');
          console.log('[AudioTrackManager] - videoElement.audioTracks:', (videoElement as any).audioTracks);
          console.log('[AudioTrackManager] - videoElement.audioTracks length:', (videoElement as any).audioTracks?.length);
          console.log('[AudioTrackManager] - videoElement.duration:', videoElement.duration);
          console.log('[AudioTrackManager] - videoElement.videoTracks:', (videoElement as any).videoTracks);
          console.log('[AudioTrackManager] - videoElement.textTracks:', videoElement.textTracks);
          
          // Check more properties
          console.log('[AudioTrackManager] Additional video element properties:');
          console.log('[AudioTrackManager] - videoElement.mozHasAudio:', (videoElement as any).mozHasAudio);
          console.log('[AudioTrackManager] - videoElement.webkitAudioDecodedByteCount:', (videoElement as any).webkitAudioDecodedByteCount);
          console.log('[AudioTrackManager] - videoElement.buffered:', videoElement.buffered);
          console.log('[AudioTrackManager] - videoElement.seekable:', videoElement.seekable);
          
          // Check if we can get media source info
          console.log('[AudioTrackManager] Source properties:');
          console.log('[AudioTrackManager] - videoElement.src:', videoElement.src);
          console.log('[AudioTrackManager] - videoElement.currentSrc:', videoElement.currentSrc);
          
          // Try to check the actual media streams if available
          if ((videoElement as any).captureStream) {
            try {
              const stream = (videoElement as any).captureStream();
              console.log('[AudioTrackManager] Media stream:', stream);
              console.log('[AudioTrackManager] Audio tracks in stream:', stream.getAudioTracks());
              console.log('[AudioTrackManager] Video tracks in stream:', stream.getVideoTracks());
            } catch (e) {
              console.log('[AudioTrackManager] Could not capture stream:', e);
            }
          }
          
          // Check if HTML5 has audio tracks that Video.js doesn't see
          const htmlAudioTracks = (videoElement as any).audioTracks;
          if (htmlAudioTracks && htmlAudioTracks.length > 0) {
            console.log('[AudioTrackManager] HTML5 video element HAS audio tracks that Video.js missed!');
            for (let i = 0; i < htmlAudioTracks.length; i++) {
              const track = htmlAudioTracks[i];
              console.log(`[AudioTrackManager] HTML5 Track ${i}:`, {
                id: track.id,
                label: track.label,
                language: track.language,
                enabled: track.enabled,
                kind: track.kind
              });
            }
          } else {
            console.log('[AudioTrackManager] HTML5 video element also shows no audio tracks');
          }
        }
        
        const tracks: AudioTrack[] = [];
        
        // Convert Video.js audio tracks to our format
        for (let i = 0; i < audioTrackList.length; i++) {
          const track = audioTrackList[i];
          console.log(`[AudioTrackManager] Track ${i}:`, {
            id: track.id,
            label: track.label,
            language: track.language,
            enabled: track.enabled,
            kind: track.kind
          });
          
          tracks.push({
            id: track.id || `track-${i}`,
            label: track.label || `Audio Track ${i + 1}`,
            language: track.language || undefined,
            enabled: track.enabled,
            kind: track.kind || 'main'
          });
        }

        console.log('[AudioTrackManager] Processed audio tracks:', tracks);
        setAudioTracks(tracks);
        setIsSupported(tracks.length > 1); // Only show controls if multiple tracks
        console.log('[AudioTrackManager] Is supported (multiple tracks):', tracks.length > 1);

        // If Video.js found no tracks, try HTML5 fallback
        if (tracks.length === 0 && videoElement) {
          console.log('[AudioTrackManager] Video.js found no tracks, trying HTML5 fallback');
          const htmlAudioTracks = (videoElement as any).audioTracks;
          if (htmlAudioTracks && htmlAudioTracks.length > 0) {
            console.log('[AudioTrackManager] Using HTML5 audio tracks as fallback');
            const fallbackTracks: AudioTrack[] = [];
            for (let i = 0; i < htmlAudioTracks.length; i++) {
              const track = htmlAudioTracks[i];
              fallbackTracks.push({
                id: track.id || `html5-track-${i}`,
                label: track.label || `Audio Track ${i + 1}`,
                language: track.language || undefined,
                enabled: track.enabled,
                kind: track.kind || 'main'
              });
            }
            console.log('[AudioTrackManager] HTML5 fallback tracks:', fallbackTracks);
            setAudioTracks(fallbackTracks);
            setIsSupported(fallbackTracks.length > 1);
            return;
          }
        }

        // Set active track if none is set and we have tracks
        if (!activeAudioTrack && tracks.length > 0) {
          const enabledTrack = tracks.find(t => t.enabled);
          if (enabledTrack) {
            setActiveAudioTrack(enabledTrack.id);
            console.log('[AudioTrackManager] Auto-selected active track:', enabledTrack.id);
          }
        }
      });
    } catch (error) {
      console.error('[AudioTrackManager] Error detecting audio tracks:', error);
      setAudioTracks([]);
      setIsSupported(false);
    }
  }, [videoRef, activeAudioTrack]);

  // Switch to a different audio track
  const switchAudioTrack = useCallback((trackId: string) => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      console.log('[AudioTrackManager] No video element for switching track');
      return;
    }

    const player = (videoElement as any).player;
    if (!player || player.isDisposed()) {
      console.log('[AudioTrackManager] No Video.js player for switching track');
      return;
    }

    try {
      const audioTrackList = player.audioTracks();
      
      // Find the track to enable
      const targetTrack = audioTracks.find(t => t.id === trackId);
      if (!targetTrack) {
        console.log('[AudioTrackManager] Target track not found:', trackId);
        return;
      }

      console.log('[AudioTrackManager] Switching to audio track:', trackId, targetTrack.label);

      // Try Video.js first
      if (audioTrackList && audioTrackList.length > 0) {
        console.log('[AudioTrackManager] Using Video.js to switch tracks');
        // Disable all tracks first
        for (let i = 0; i < audioTrackList.length; i++) {
          audioTrackList[i].enabled = false;
        }

        // Enable the selected track
        for (let i = 0; i < audioTrackList.length; i++) {
          const track = audioTrackList[i];
          if (track.id === trackId || `track-${i}` === trackId) {
            track.enabled = true;
            console.log('[AudioTrackManager] Enabled Video.js track:', track.id || `track-${i}`, track.label);
            break;
          }
        }
      } else {
        console.log('[AudioTrackManager] Trying HTML5 audio track switching');
        // Fallback to HTML5 audio tracks
        const htmlAudioTracks = (videoElement as any).audioTracks;
        if (htmlAudioTracks && htmlAudioTracks.length > 0) {
          // Disable all tracks first
          for (let i = 0; i < htmlAudioTracks.length; i++) {
            htmlAudioTracks[i].enabled = false;
          }

          // Enable the selected track
          for (let i = 0; i < htmlAudioTracks.length; i++) {
            const track = htmlAudioTracks[i];
            if (track.id === trackId || `html5-track-${i}` === trackId) {
              track.enabled = true;
              console.log('[AudioTrackManager] Enabled HTML5 track:', track.id || `html5-track-${i}`, track.label);
              break;
            }
          }
        }
      }

      setActiveAudioTrack(trackId);
    } catch (error) {
      console.error('[AudioTrackManager] Error switching audio track:', error);
    }
  }, [videoRef, audioTracks]);

  // Effect to detect audio tracks when video changes
  useEffect(() => {
    console.log('[AudioTrackManager] useEffect triggered, checking for video element');
    const videoElement = videoRef.current;
    if (!videoElement) {
      console.log('[AudioTrackManager] No video element in useEffect');
      return;
    }

    console.log('[AudioTrackManager] Video element found, checking for player');
    const player = (videoElement as any).player;
    if (!player) {
      console.log('[AudioTrackManager] No player attached to video element yet');
      return;
    }

    console.log('[AudioTrackManager] Player found, checking if disposed');
    if (player.isDisposed()) {
      console.log('[AudioTrackManager] Player is disposed');
      return;
    }

    // Check if video source has changed
    const currentSrc = player.currentSrc ? player.currentSrc() : '';
    console.log('[AudioTrackManager] Current src:', currentSrc);
    console.log('[AudioTrackManager] Last src:', lastVideoSrcRef.current);
    
    if (currentSrc === lastVideoSrcRef.current && currentSrc !== '') {
      console.log('[AudioTrackManager] Same video, no need to re-detect');
      return; // Same video, no need to re-detect
    }
    
    lastVideoSrcRef.current = currentSrc;
    console.log('[AudioTrackManager] Video source changed, setting up detection');

    // Listen for when audio tracks are available
    const onLoadedMetadata = () => {
      console.log('[AudioTrackManager] Metadata loaded event, detecting audio tracks');
      setTimeout(detectAudioTracks, 500); // Increased delay to ensure tracks are ready
    };

    const onAudioTracksChange = () => {
      console.log('[AudioTrackManager] Audio tracks changed event');
      detectAudioTracks();
    };

    // Add event listeners
    console.log('[AudioTrackManager] Adding event listeners');
    player.on('loadedmetadata', onLoadedMetadata);
    player.on('audiotrackchange', onAudioTracksChange);

    // Try to detect immediately if metadata is already loaded
    console.log('[AudioTrackManager] Player ready state:', player.readyState());
    if (player.readyState() >= 1) {
      console.log('[AudioTrackManager] Metadata already loaded, detecting immediately');
      setTimeout(detectAudioTracks, 100);
    }

    return () => {
      console.log('[AudioTrackManager] Cleaning up event listeners');
      if (player && !player.isDisposed()) {
        player.off('loadedmetadata', onLoadedMetadata);
        player.off('audiotrackchange', onAudioTracksChange);
      }
    };
  }, [videoRef.current, detectAudioTracks]);

  // Additional effect to try detection when player becomes available
  useEffect(() => {
    console.log('[AudioTrackManager] Additional effect - checking player availability');
    const checkPlayerAndDetect = () => {
      const videoElement = videoRef.current;
      if (!videoElement) {
        console.log('[AudioTrackManager] No video element for additional check');
        return;
      }

      const player = (videoElement as any).player;
      if (!player || player.isDisposed()) {
        console.log('[AudioTrackManager] No player available for additional check');
        return;
      }

      console.log('[AudioTrackManager] Player available for additional check, ready state:', player.readyState());
      if (player.readyState() >= 1) {
        console.log('[AudioTrackManager] Triggering detection from additional effect');
        detectAudioTracks();
      }
    };

    // Try immediately and also with a delay
    checkPlayerAndDetect();
    const timeout = setTimeout(checkPlayerAndDetect, 1000);
    const timeout2 = setTimeout(checkPlayerAndDetect, 3000); // Try again after 3 seconds
    
    return () => {
      clearTimeout(timeout);
      clearTimeout(timeout2);
    };
  }, [videoRef.current, detectAudioTracks]);

  // Polling effect as a last resort
  useEffect(() => {
    console.log('[AudioTrackManager] Setting up polling effect');
    const pollForPlayer = () => {
      const videoElement = videoRef.current;
      if (!videoElement) {
        console.log('[AudioTrackManager] Polling: No video element');
        return;
      }

      const player = (videoElement as any).player;
      if (player && !player.isDisposed() && player.readyState() >= 1) {
        console.log('[AudioTrackManager] Polling: Found ready player, detecting tracks');
        detectAudioTracks();
        return true; // Stop polling
      }
      return false;
    };

    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(() => {
      attempts++;
      console.log(`[AudioTrackManager] Polling attempt ${attempts}/${maxAttempts}`);
      
      if (pollForPlayer() || attempts >= maxAttempts) {
        console.log('[AudioTrackManager] Stopping polling');
        clearInterval(interval);
      }
    }, 1000);

    return () => {
      console.log('[AudioTrackManager] Cleaning up polling');
      clearInterval(interval);
    };
  }, [videoRef.current, detectAudioTracks]);

  // Effect to handle initial active track
  useEffect(() => {
    if (initialActiveTrackId && audioTracks.length > 0) {
      const trackExists = audioTracks.some(t => t.id === initialActiveTrackId);
      if (trackExists && activeAudioTrack !== initialActiveTrackId) {
        switchAudioTrack(initialActiveTrackId);
      }
    }
  }, [initialActiveTrackId, audioTracks, activeAudioTrack, switchAudioTrack]);

  return {
    audioTracks,
    activeAudioTrack,
    isSupported,
    switchAudioTrack,
    detectAudioTracks
  };
}; 