import React, { useState, useEffect } from 'react';

interface SubtitleTimingControlProps {
  currentOffset: number;
  onOffsetChange: (newOffset: number) => void;
}

export const SubtitleTimingControl: React.FC<SubtitleTimingControlProps> = ({
  currentOffset,
  onOffsetChange
}) => {
  const safeOffset = currentOffset ?? 0;
  const [inputValue, setInputValue] = useState<string>(safeOffset.toFixed(2));

  useEffect(() => {
    setInputValue(safeOffset.toFixed(2));
  }, [safeOffset]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const newOffset = parseFloat(inputValue);
    if (!isNaN(newOffset)) {
      onOffsetChange(newOffset);
    } else {
      // Reset to current valid offset if input is invalid
      setInputValue(safeOffset.toFixed(2));
    }
  };
  
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
      (e.target as HTMLInputElement).blur(); // Remove focus
    }
  };

  const adjustOffset = (amount: number) => {
    const newOffset = parseFloat((safeOffset + amount).toFixed(2));
    onOffsetChange(newOffset);
  };

  return (
    <div className="subtitle-timing-control">
      <div className="timing-header">
        <span>⏱️ Subtitle Timing (Offset)</span>
      </div>
      <div className="timing-controls">
        <div className="offset-input-group">
          <label htmlFor="subtitle-offset">Offset (s):</label>
          <input 
            type="number"
            id="subtitle-offset"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            step="0.1"
            className="offset-input"
          />
        </div>
        <div className="offset-buttons">
          <button onClick={() => adjustOffset(-1)} title="-1 second">-1s</button>
          <button onClick={() => adjustOffset(-0.1)} title="-0.1 seconds">-0.1s</button>
          <button onClick={() => onOffsetChange(0)} title="Reset offset to 0">Reset</button>
          <button onClick={() => adjustOffset(0.1)} title="+0.1 seconds">+0.1s</button>
          <button onClick={() => adjustOffset(1)} title="+1 second">+1s</button>
        </div>
      </div>
       <div className="control-instructions">
        <p>Adjust subtitle timing. Positive values delay subtitles, negative values show them earlier.</p>
      </div>
    </div>
  );
}; 