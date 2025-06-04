import { useState, useEffect, useRef, useCallback } from 'react';

interface UseAudioRecordingProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  bufferDurationSeconds?: number;
}

interface AudioRecordingState {
  isRecording: boolean;
  isSupported: boolean;
  error: string | null;
  bufferDuration: number;
  isCapturingTimeRange: boolean;
}

export const useAudioRecording = ({ videoRef, bufferDurationSeconds = 30 }: UseAudioRecordingProps) => {
  const [state, setState] = useState<AudioRecordingState>({
    isRecording: false,
    isSupported: false,
    error: null,
    bufferDuration: bufferDurationSeconds,
    isCapturingTimeRange: false
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const audioBufferRef = useRef<Float32Array[]>([]);
  const bufferIndexRef = useRef<number>(0);
  const sampleRateRef = useRef<number>(44100);

  // Check if audio recording is supported
  useEffect(() => {
    const isSupported = !!(window.AudioContext || (window as any).webkitAudioContext) && 
                       !!navigator.clipboard && 
                       !!navigator.clipboard.write;
    setState(prev => ({ ...prev, isSupported }));
  }, []);

  // Initialize audio buffer
  const initializeBuffer = useCallback((sampleRate: number, duration: number) => {
    const bufferSize = Math.floor(sampleRate * duration);
    const chunkSize = 4096; // ScriptProcessorNode buffer size
    const numChunks = Math.ceil(bufferSize / chunkSize);
    
    audioBufferRef.current = new Array(numChunks).fill(null).map(() => new Float32Array(chunkSize));
    bufferIndexRef.current = 0;
    sampleRateRef.current = sampleRate;
  }, []);

  // Start recording audio from video
  const startRecording = useCallback(async () => {
    console.log('startRecording called', { 
      isSupported: state.isSupported, 
      hasVideo: !!videoRef.current, 
      isRecording: state.isRecording 
    });
    
    if (!state.isSupported) {
      console.log('Audio recording not supported');
      setState(prev => ({ ...prev, error: 'Audio recording not supported' }));
      return;
    }
    
    if (!videoRef.current) {
      console.log('No video element available');
      setState(prev => ({ ...prev, error: 'No video element available' }));
      return;
    }
    
    if (state.isRecording) {
      console.log('Already recording');
      return;
    }

    try {
      console.log('Starting audio recording...');
      
      // Create audio context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('AudioContext not available');
      }
      
      const audioContext = new AudioContextClass();
      console.log('AudioContext created', { sampleRate: audioContext.sampleRate });
      audioContextRef.current = audioContext;

      // Create source from video element
      const source = audioContext.createMediaElementSource(videoRef.current);
      console.log('MediaElementAudioSourceNode created');
      sourceNodeRef.current = source;

      // Create script processor for audio capture
      const processor = audioContext.createScriptProcessor(4096, 2, 2);
      console.log('ScriptProcessorNode created');
      processorNodeRef.current = processor;

      // Initialize buffer
      initializeBuffer(audioContext.sampleRate, state.bufferDuration);
      console.log('Audio buffer initialized');

      // Process audio data
      processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const leftChannel = inputBuffer.getChannelData(0);
        const rightChannel = inputBuffer.numberOfChannels > 1 ? inputBuffer.getChannelData(1) : leftChannel;
        
        // Mix to mono and store in circular buffer
        const monoData = new Float32Array(leftChannel.length);
        for (let i = 0; i < leftChannel.length; i++) {
          monoData[i] = (leftChannel[i] + rightChannel[i]) / 2;
        }

        // Store in circular buffer
        const bufferIndex = bufferIndexRef.current % audioBufferRef.current.length;
        audioBufferRef.current[bufferIndex] = monoData;
        bufferIndexRef.current++;
      };

      // Connect nodes
      source.connect(processor);
      processor.connect(audioContext.destination);
      source.connect(audioContext.destination); // Also connect to output so video audio still plays
      console.log('Audio nodes connected');

      setState(prev => ({ ...prev, isRecording: true, error: null }));
      console.log('Recording started successfully');
    } catch (error) {
      console.error('Error starting audio recording:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to start recording' 
      }));
    }
  }, [videoRef, state.isSupported, state.isRecording, state.bufferDuration, initializeBuffer]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    sourceNodeRef.current = null;
    processorNodeRef.current = null;
    
    setState(prev => ({ ...prev, isRecording: false }));
  }, []);

  // Convert Float32Array to WAV file
  const createWavFile = useCallback((audioData: Float32Array, sampleRate: number): Blob => {
    const length = audioData.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    const writeUint32 = (offset: number, value: number) => {
      view.setUint32(offset, value, true);
    };

    const writeUint16 = (offset: number, value: number) => {
      view.setUint16(offset, value, true);
    };

    // RIFF header
    writeString(0, 'RIFF');
    writeUint32(4, 36 + length * 2);
    writeString(8, 'WAVE');

    // Format chunk
    writeString(12, 'fmt ');
    writeUint32(16, 16);
    writeUint16(20, 1); // PCM format
    writeUint16(22, 1); // Mono
    writeUint32(24, sampleRate);
    writeUint32(28, sampleRate * 2);
    writeUint16(32, 2);
    writeUint16(34, 16);

    // Data chunk
    writeString(36, 'data');
    writeUint32(40, length * 2);

    // Convert audio data to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, audioData[i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }, []);

  // Download buffered audio as WAV file
  const downloadBufferedAudio = useCallback(async () => {
    if (!state.isRecording || audioBufferRef.current.length === 0) {
      setState(prev => ({ ...prev, error: 'No audio data available' }));
      return;
    }

    try {
      // Combine all buffer chunks in the correct order
      const totalSamples = audioBufferRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
      const combinedBuffer = new Float32Array(totalSamples);
      
      let offset = 0;
      const startIndex = bufferIndexRef.current % audioBufferRef.current.length;
      
      // Copy from start index to end of array
      for (let i = startIndex; i < audioBufferRef.current.length; i++) {
        const chunk = audioBufferRef.current[i];
        if (chunk) {
          combinedBuffer.set(chunk, offset);
          offset += chunk.length;
        }
      }
      
      // Copy from beginning to start index
      for (let i = 0; i < startIndex; i++) {
        const chunk = audioBufferRef.current[i];
        if (chunk) {
          combinedBuffer.set(chunk, offset);
          offset += chunk.length;
        }
      }

      // Create WAV file
      const wavBlob = createWavFile(combinedBuffer, sampleRateRef.current);
      
      // Create download link
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audio-clip-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('Audio file downloaded successfully');
      setState(prev => ({ ...prev, error: null }));
      
    } catch (error) {
      console.error('Error downloading audio:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to download audio' 
      }));
    }
  }, [state.isRecording, createWavFile]);

  // Copy audio as data URL to clipboard (as text)
  const copyAudioDataUrl = useCallback(async () => {
    if (!state.isRecording || audioBufferRef.current.length === 0) {
      setState(prev => ({ ...prev, error: 'No audio data available' }));
      return;
    }

    try {
      // Combine all buffer chunks in the correct order
      const totalSamples = audioBufferRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
      const combinedBuffer = new Float32Array(totalSamples);
      
      let offset = 0;
      const startIndex = bufferIndexRef.current % audioBufferRef.current.length;
      
      // Copy from start index to end of array
      for (let i = startIndex; i < audioBufferRef.current.length; i++) {
        const chunk = audioBufferRef.current[i];
        if (chunk) {
          combinedBuffer.set(chunk, offset);
          offset += chunk.length;
        }
      }
      
      // Copy from beginning to start index
      for (let i = 0; i < startIndex; i++) {
        const chunk = audioBufferRef.current[i];
        if (chunk) {
          combinedBuffer.set(chunk, offset);
          offset += chunk.length;
        }
      }

      // Create WAV file and convert to data URL
      const wavBlob = createWavFile(combinedBuffer, sampleRateRef.current);
      const reader = new FileReader();
      
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          await navigator.clipboard.writeText(dataUrl);
          console.log('Audio data URL copied to clipboard successfully');
          setState(prev => ({ ...prev, error: null }));
        } catch (clipboardError) {
          console.error('Error copying to clipboard:', clipboardError);
          setState(prev => ({ 
            ...prev, 
            error: 'Failed to copy data URL to clipboard' 
          }));
        }
      };
      
      reader.onerror = () => {
        setState(prev => ({ 
          ...prev, 
          error: 'Failed to create data URL' 
        }));
      };
      
      reader.readAsDataURL(wavBlob);
      
    } catch (error) {
      console.error('Error creating audio data URL:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to create audio data URL' 
      }));
    }
  }, [state.isRecording, createWavFile]);

  // Capture audio for a specific time range (e.g., subtitle line + buffer)
  const captureTimeRange = useCallback(async (startTime: number, endTime: number, bufferSeconds: number = 2) => {
    if (!state.isSupported || !videoRef.current || state.isCapturingTimeRange) {
      return;
    }

    const video = videoRef.current;
    const originalTime = video.currentTime;
    const captureStart = Math.max(0, startTime - bufferSeconds);
    const captureEnd = Math.min(video.duration || endTime + bufferSeconds, endTime + bufferSeconds);
    const captureDuration = captureEnd - captureStart;

    if (captureDuration <= 0) {
      setState(prev => ({ ...prev, error: 'Invalid time range for capture' }));
      return;
    }

    setState(prev => ({ ...prev, isCapturingTimeRange: true, error: null }));

    try {
      // Create a temporary audio element to capture from instead of the video
      const tempAudio = document.createElement('audio');
      tempAudio.src = video.src;
      tempAudio.currentTime = captureStart;
      tempAudio.crossOrigin = 'anonymous';
      
      // Wait for audio to load
      await new Promise<void>((resolve, reject) => {
        tempAudio.addEventListener('canplay', () => resolve(), { once: true });
        tempAudio.addEventListener('error', reject, { once: true });
        tempAudio.load();
      });

      // Create audio context and capture from temp audio
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      
      const source = audioContext.createMediaElementSource(tempAudio);
      const processor = audioContext.createScriptProcessor(4096, 2, 2);
      
      const capturedChunks: Float32Array[] = [];
      const sampleRate = audioContext.sampleRate;
      
      processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const leftChannel = inputBuffer.getChannelData(0);
        const rightChannel = inputBuffer.numberOfChannels > 1 ? inputBuffer.getChannelData(1) : leftChannel;
        
        const monoData = new Float32Array(leftChannel.length);
        for (let i = 0; i < leftChannel.length; i++) {
          monoData[i] = (leftChannel[i] + rightChannel[i]) / 2;
        }
        
        capturedChunks.push(new Float32Array(monoData));
      };

      // Connect audio nodes
      source.connect(processor);
      processor.connect(audioContext.destination);

      // Start temp audio playback
      await tempAudio.play();

      // Wait for capture duration
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, captureDuration * 1000);
      });

      // Stop temp audio and cleanup
      tempAudio.pause();
      processor.disconnect();
      source.disconnect();
      audioContext.close();
      tempAudio.remove();

      // Combine captured chunks
      const totalSamples = capturedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combinedBuffer = new Float32Array(totalSamples);
      let offset = 0;
      
      for (const chunk of capturedChunks) {
        combinedBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      // Create WAV file
      const wavBlob = createWavFile(combinedBuffer, sampleRate);
      
      // Download the captured audio
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subtitle-audio-${startTime.toFixed(1)}s-${endTime.toFixed(1)}s.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setState(prev => ({ ...prev, isCapturingTimeRange: false, error: null }));

    } catch (error) {
      console.error('Error capturing time range audio:', error);
      setState(prev => ({ 
        ...prev, 
        isCapturingTimeRange: false,
        error: error instanceof Error ? error.message : 'Failed to capture audio for time range' 
      }));
    }
  }, [state.isSupported, state.isCapturingTimeRange, createWavFile, videoRef]);

  // Update buffer duration
  const setBufferDuration = useCallback((duration: number) => {
    setState(prev => ({ ...prev, bufferDuration: duration }));
    
    if (state.isRecording && audioContextRef.current) {
      // Reinitialize buffer with new duration
      initializeBuffer(audioContextRef.current.sampleRate, duration);
    }
  }, [state.isRecording, initializeBuffer]);

  // Clear error state
  const clearError = useCallback(() => {
    console.log('Clearing audio recording error');
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Log state changes
  useEffect(() => {
    if (state.error) {
      console.log('Audio recording error set:', state.error);
    }
  }, [state.error]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    ...state,
    startRecording,
    stopRecording,
    downloadBufferedAudio,
    copyAudioDataUrl,
    setBufferDuration,
    captureTimeRange,
    clearError
  };
}; 