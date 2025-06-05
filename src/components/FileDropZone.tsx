import React, { useState } from 'react';

interface FileDropZoneProps {
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInputClick: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUrlSubmit?: (url: string) => void;
  customMessage?: string;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInputClick,
  fileInputRef,
  onFileSelect,
  onUrlSubmit,
  customMessage
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isSubmittingUrl, setIsSubmittingUrl] = useState(false);

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || !onUrlSubmit) return;
    
    setIsSubmittingUrl(true);
    try {
      await onUrlSubmit(urlInput.trim());
      setUrlInput('');
    } catch (error) {
      console.error('Failed to process URL:', error);
    } finally {
      setIsSubmittingUrl(false);
    }
  };

  return (
    <div
      className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onFileInputClick}
    >
      <div className="drop-zone-content">
        <p>📁</p>
        <p>
          {customMessage || 
            "Drag and drop video files here, or click to browse"
          }
        </p>
        <p className="supported-formats">
          Supported formats: MP4, AVI, MOV, MKV, WebM, OGG
        </p>
        
        {/* URL Input Section */}
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          border: '1px solid #ddd', 
          borderRadius: '8px',
          backgroundColor: '#f9f9f9'
        }}>
          <p style={{ margin: '0 0 10px 0', fontWeight: '600', fontSize: '14px' }}>
            🔗 Or paste a YouTube URL:
          </p>
          <form onSubmit={handleUrlSubmit} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={isSubmittingUrl}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              onClick={(e) => e.stopPropagation()} // Prevent triggering file dialog
            />
            <button
              type="submit"
              disabled={!urlInput.trim() || isSubmittingUrl}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ff0000',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isSubmittingUrl ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: (!urlInput.trim() || isSubmittingUrl) ? 0.5 : 1
              }}
              onClick={(e) => e.stopPropagation()} // Prevent triggering file dialog
            >
              {isSubmittingUrl ? 'Loading...' : 'Load'}
            </button>
          </form>
        </div>
        
        <p className="transcoding-note">
          Note: Some video formats may require transcoding for web playback
        </p>
        <p className="compatibility-note">
          For best compatibility, use MP4 format with H.264 codec
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,.mp4,.avi,.mov,.mkv,.webm,.ogg,.m4v,.flv,.wmv"
        multiple
        onChange={onFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
}; 