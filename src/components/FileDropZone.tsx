import React from 'react';

interface FileDropZoneProps {
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInputClick: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInputClick,
  fileInputRef,
  onFileSelect
}) => {
  return (
    <div
      className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onFileInputClick}
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
          onChange={onFileSelect}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}; 