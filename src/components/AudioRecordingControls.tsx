import React, { useState } from 'react';

interface AudioRecordingControlsProps {
  isRecording: boolean;
  isSupported: boolean;
  error: string | null;
  bufferDuration: number;
  isCapturingTimeRange: boolean;
  dictionaryBufferSeconds: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDownloadAudio: () => void;
  onCopyAudioDataUrl: () => void;
  onCopyAudioAsHtml?: () => void;
  onSetBufferDuration: (duration: number) => void;
  onSetDictionaryBufferSeconds: (bufferSeconds: number) => void;
  onClearError: () => void;
}

export const AudioRecordingControls: React.FC<AudioRecordingControlsProps> = ({
  isRecording,
  isSupported,
  error,
  bufferDuration,
  isCapturingTimeRange,
  dictionaryBufferSeconds,
  onStartRecording,
  onStopRecording,
  onDownloadAudio,
  onCopyAudioDataUrl,
  onCopyAudioAsHtml,
  onSetBufferDuration,
  onSetDictionaryBufferSeconds,
  onClearError
}) => {
  const [showSettings, setShowSettings] = useState(false);

  if (!isSupported) {
    return (
      <div className="audio-recording-controls">
        <div className="audio-recording-header">
          <span>🎵 Audio Recording</span>
        </div>
        <div className="audio-recording-content">
          <p className="unsupported-message">
            Audio recording is not supported in this browser or requires HTTPS.
          </p>
        </div>
      </div>
    );
  }

  const handleStartRecording = () => {
    if (typeof onStartRecording === 'function') {
      onStartRecording();
    } else {
      console.error('onStartRecording is not a function:', onStartRecording);
    }
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSetBufferDuration(parseInt(e.target.value));
  };

  const handleDictionaryBufferChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSetDictionaryBufferSeconds(parseFloat(e.target.value));
  };

  return (
    <div className="audio-recording-controls">
      <div className="audio-recording-header">
        <span>🎵 Audio Recording</span>
        <button 
          className="settings-toggle"
          onClick={() => setShowSettings(!showSettings)}
          title="Audio recording settings"
        >
          ⚙️
        </button>
      </div>
      
      {showSettings && (
        <div className="audio-recording-settings">
          <div className="setting-group">
            <label htmlFor="buffer-duration">Buffer Duration:</label>
            <select 
              id="buffer-duration"
              value={bufferDuration} 
              onChange={handleDurationChange}
              disabled={isRecording}
            >
              <option value={10}>10 seconds</option>
              <option value={15}>15 seconds</option>
              <option value={20}>20 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={45}>45 seconds</option>
              <option value={60}>1 minute</option>
            </select>
          </div>
          <p className="setting-help">
            This determines how much audio history is kept in memory.
          </p>
          
          <div className="setting-group">
            <label htmlFor="dictionary-buffer">Dictionary Lookup Buffer:</label>
            <select 
              id="dictionary-buffer"
              value={dictionaryBufferSeconds} 
              onChange={handleDictionaryBufferChange}
            >
              <option value={0}>0 seconds (exact timing)</option>
              <option value={0.5}>0.5 seconds</option>
              <option value={1}>1 second</option>
              <option value={1.5}>1.5 seconds</option>
              <option value={2}>2 seconds</option>
              <option value={3}>3 seconds</option>
            </select>
          </div>
          <p className="setting-help">
            Extra audio buffer before/after dictionary lookup timing (Shift+Click).
          </p>
        </div>
      )}

      <div className="audio-recording-controls-main">
        <div className="recording-status">
          {isRecording ? (
            <div className="recording-active">
              <span className="recording-indicator">🔴</span>
              <span>Recording last {bufferDuration}s</span>
            </div>
          ) : isCapturingTimeRange ? (
            <div className="recording-active">
              <span className="recording-indicator">🎤</span>
              <span>Capturing subtitle audio...</span>
            </div>
          ) : (
            <span className="recording-inactive">Audio recording stopped</span>
          )}
        </div>

        <div className="recording-buttons">
          {!isRecording && !isCapturingTimeRange ? (
            <button 
              onClick={handleStartRecording}
              className="start-recording-btn"
              title="Start recording audio buffer"
            >
              Start Recording
            </button>
          ) : isRecording ? (
            <>
              <button 
                onClick={onStopRecording}
                className="stop-recording-btn"
                title="Stop recording"
              >
                Stop Recording
              </button>
              <button 
                onClick={onDownloadAudio}
                className="download-audio-btn"
                title="Download audio buffer"
              >
                Download Audio
              </button>
              <button 
                onClick={onCopyAudioDataUrl}
                className="copy-audio-data-url-btn"
                title="Copy audio data URL"
              >
                Copy Audio Data URL
              </button>
              {onCopyAudioAsHtml && (
                <button 
                  onClick={onCopyAudioAsHtml}
                  className="copy-audio-html-btn"
                  title="Copy as HTML audio component"
                >
                  Copy as HTML Component
                </button>
              )}
            </>
          ) : null}
        </div>

        {error && (
          <div className="audio-recording-error">
            ⚠️ {error}
            <button 
              onClick={onClearError}
              style={{ marginLeft: '10px', padding: '2px 6px', fontSize: '0.8em' }}
            >
              Clear Error
            </button>
          </div>
        )}
      </div>

      <div className="audio-recording-instructions">
        <p>💡 <strong>How to use:</strong></p>
        <p>1. Click "Start Recording" to begin buffering audio</p>
        <p>2. Play your video - audio will be continuously captured</p>
        <p>3. Click "Download Audio" to save the audio buffer</p>
        <p>4. Click "Copy Audio Data URL" to copy the audio data URL</p>
        <p>5. Click "Copy as HTML Component" to copy a clickable audio widget</p>
        <p>6. Paste the audio file in any application that supports WAV files</p>
        <p>🎤 <strong>Subtitle Capture:</strong> Click the microphone button (🎤) on any subtitle line to capture that dialogue with ±2 second buffer!</p>
        <p>🎵 <strong>Dictionary Lookup:</strong> Shift+Click any Japanese text to get audio + screenshot + definitions in one modal!</p>
      </div>
    </div>
  );
}; 