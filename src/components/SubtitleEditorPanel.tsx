import React, { useState } from 'react';
import { SubtitleCue } from '../types';

interface SubtitleEditorPanelProps {
  cues: SubtitleCue[];
  onCuesUpdate: (updatedCues: SubtitleCue[]) => void;
  onClose: () => void;
}

export const SubtitleEditorPanel: React.FC<SubtitleEditorPanelProps> = ({ cues: initialCues, onCuesUpdate, onClose }) => {
  const [cues, setCues] = useState(initialCues);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [adjustment, setAdjustment] = useState(0);

  // Sync cues if the prop changes (e.g., when reopening the panel)
  React.useEffect(() => {
    setCues(initialCues);
    setSelectedIndexes(new Set());
  }, [initialCues]);

  const handleCheckboxChange = (index: number) => {
    setSelectedIndexes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIndexes.size === cues.length) {
      setSelectedIndexes(new Set());
    } else {
      setSelectedIndexes(new Set(cues.map((_, i) => i)));
    }
  };

  const handleAdjustmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdjustment(Number(e.target.value));
  };

  const handleApplyAdjustment = () => {
    const updatedCues = cues.map((cue, i) => {
      if (selectedIndexes.has(i)) {
        return {
          ...cue,
          startTime: Math.max(0, cue.startTime + adjustment),
          endTime: Math.max(0, cue.endTime + adjustment),
        };
      }
      return cue;
    });
    setCues(updatedCues);
    setSelectedIndexes(new Set());
    onCuesUpdate(updatedCues);
  };

  const handleExport = () => {
    const vttContent = 'WEBVTT\n\n' + cues.map(cue => {
      const format = (t: number) => {
        const h = String(Math.floor(t / 3600)).padStart(2, '0');
        const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
        const s = String(Math.floor(t % 60)).padStart(2, '0');
        const ms = String(Math.round((t % 1) * 1000)).padStart(3, '0');
        return `${h}:${m}:${s}.${ms}`;
      };
      return `${format(cue.startTime)} --> ${format(cue.endTime)}\n${cue.text}\n`;
    }).join('\n');
    const blob = new Blob([vttContent], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edited_subtitles.vtt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSelectAllBefore = (index: number) => {
    setSelectedIndexes(prev => {
      const newSet = new Set(prev);
      for (let i = 0; i < index; i++) {
        newSet.add(i);
      }
      return newSet;
    });
  };

  const handleSelectAllAfter = (index: number) => {
    setSelectedIndexes(prev => {
      const newSet = new Set(prev);
      for (let i = index + 1; i < cues.length; i++) {
        newSet.add(i);
      }
      return newSet;
    });
  };

  return (
    <div className="subtitle-editor-panel">
      <div className="panel-header">
        <span>Edit Subtitles</span>
        <button onClick={onClose} title="Close">✖</button>
      </div>
      <div className="panel-controls">
        <button onClick={handleSelectAll}>{selectedIndexes.size === cues.length ? 'Deselect All' : 'Select All'}</button>
        <input
          type="number"
          value={adjustment}
          onChange={handleAdjustmentChange}
          step="0.1"
          style={{ width: 80 }}
          aria-label="Timing adjustment in seconds"
        />
        <button onClick={handleApplyAdjustment} disabled={selectedIndexes.size === 0}>Apply Adjustment</button>
        <button onClick={handleExport}>Export VTT</button>
      </div>
      <div className="subtitle-list" style={{ maxHeight: 300, overflowY: 'auto' }}>
        {cues.map((cue, i) => (
          <div key={i} className="subtitle-line" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="checkbox"
              checked={selectedIndexes.has(i)}
              onChange={() => handleCheckboxChange(i)}
            />
            <span style={{ marginLeft: 8, fontFamily: 'monospace', flex: 1 }}>
              [{cue.startTime.toFixed(2)} - {cue.endTime.toFixed(2)}] {cue.text}
            </span>
            <button
              style={{ fontSize: '0.8em', padding: '2px 6px' }}
              title="Select all before this line"
              onClick={() => handleSelectAllBefore(i)}
            >
              ↑ All Before
            </button>
            <button
              style={{ fontSize: '0.8em', padding: '2px 6px' }}
              title="Select all after this line"
              onClick={() => handleSelectAllAfter(i)}
            >
              ↓ All After
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}; 