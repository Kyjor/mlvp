import React, { useState, useEffect } from 'react';
import { AnkiNote } from '../types';

interface AnkiModalProps {
  open: boolean;
  onClose: () => void;
  initialNote: Partial<AnkiNote>;
  apiBaseUrl: string;
  deckName: string;
  onSettingsChange: (apiBaseUrl: string, deckName: string) => void;
}

export const AnkiModal: React.FC<AnkiModalProps> = ({
  open,
  onClose,
  initialNote,
  apiBaseUrl,
  deckName,
  onSettingsChange
}) => {
  const [note, setNote] = useState<AnkiNote>({
    sentence: initialNote.sentence || '',
    translation: initialNote.translation || '',
    targetWord: initialNote.targetWord || '',
    definitions: initialNote.definitions || ''
  });
  
  const [localApiBaseUrl, setLocalApiBaseUrl] = useState(apiBaseUrl);
  const [localDeckName, setLocalDeckName] = useState(deckName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<string>('');

  // Reset note fields when initialNote changes (when modal opens with new data)
  useEffect(() => {
    setNote({
      sentence: initialNote.sentence || '',
      translation: initialNote.translation || '',
      targetWord: initialNote.targetWord || '',
      definitions: initialNote.definitions || ''
    });
  }, [initialNote]);

  if (!open) return null;

  const handleFieldChange = (field: keyof AnkiNote, value: string) => {
    setNote(prev => ({ ...prev, [field]: value }));
  };

  const handleSettingsChange = () => {
    onSettingsChange(localApiBaseUrl, localDeckName);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitResult('');
    
    try {
      const requestBody = {
        action: "addNote",
        version: 6,
        params: {
          note: {
            deckName: localDeckName,
            modelName: "Migaku Japanese",
            fields: {
              "Sentence": note.sentence,
              "Translation": note.translation,
              "Target Word": note.targetWord,
              "Definitions": note.definitions
            },
            "options": {
                "allowDuplicate": true,
                "duplicateScope": "deck"
            }
          }
        }
      };

      const response = await fetch(localApiBaseUrl, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        setSubmitResult(`Error: ${result.error}`);
      } else {
        setSubmitResult('Note added successfully! Syncing...');
        
        // Auto-sync after successful note addition
        try {
          const syncResponse = await fetch(localApiBaseUrl, {
            method: 'POST',
            mode: 'cors',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: "sync",
              version: 6
            })
          });

          if (syncResponse.ok) {
            const syncResult = await syncResponse.json();
            if (syncResult.error) {
              setSubmitResult('Note added successfully! Sync failed: ' + syncResult.error);
            } else {
              setSubmitResult('Note added and synced successfully!');
            }
          } else {
            setSubmitResult('Note added successfully! Sync failed: HTTP error');
          }
        } catch (syncError) {
          // Sync failed, but note was added successfully
          setSubmitResult('Note added successfully! Sync failed: ' + (syncError instanceof Error ? syncError.message : 'Unknown sync error'));
        }
        
        // Auto-close after success (with slight delay for sync)
        setTimeout(() => {
          onClose();
          setSubmitResult('');
        }, 2000);
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setSubmitResult(`CORS Error: Please configure Anki Connect to allow web requests. Make sure Anki is running and AnkiConnect is installed.`);
      } else {
        setSubmitResult(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10001,
    padding: '20px'
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '600px',
    maxHeight: '90vh',
    width: '100%',
    overflow: 'auto',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
    position: 'relative'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px'
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: '80px',
    resize: 'vertical'
  };

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <h2>Add Anki Note</h2>
        <button 
          style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}
          onClick={onClose}
        >
          ×
        </button>

        {/* Anki Settings */}
        <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Anki Connect Settings</h3>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>API Base URL:</label>
            <input
              type="text"
              value={localApiBaseUrl}
              onChange={(e) => setLocalApiBaseUrl(e.target.value)}
              onBlur={handleSettingsChange}
              style={inputStyle}
              placeholder="http://localhost:8765/"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Deck Name:</label>
            <input
              type="text"
              value={localDeckName}
              onChange={(e) => setLocalDeckName(e.target.value)}
              onBlur={handleSettingsChange}
              style={inputStyle}
              placeholder="Test"
            />
          </div>
        </div>

        {/* Note Fields */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Note Fields</h3>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Sentence:</label>
            <textarea
              value={note.sentence}
              onChange={(e) => handleFieldChange('sentence', e.target.value)}
              style={textareaStyle}
              placeholder="Enter the sentence..."
            />
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Translation:</label>
            <textarea
              value={note.translation}
              onChange={(e) => handleFieldChange('translation', e.target.value)}
              style={textareaStyle}
              placeholder="Enter the translation..."
            />
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Target Word:</label>
            <input
              type="text"
              value={note.targetWord}
              onChange={(e) => handleFieldChange('targetWord', e.target.value)}
              style={inputStyle}
              placeholder="Enter the target word..."
            />
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Definitions:</label>
            <textarea
              value={note.definitions}
              onChange={(e) => handleFieldChange('definitions', e.target.value)}
              style={textareaStyle}
              placeholder="Enter the definitions..."
            />
          </div>
        </div>

        {/* Submit Result */}
        {submitResult && (
          <div style={{
            marginBottom: '12px',
            padding: '8px',
            borderRadius: '4px',
            backgroundColor: submitResult.includes('Error') || submitResult.includes('error') ? '#ffebee' : '#e8f5e8',
            color: submitResult.includes('Error') || submitResult.includes('error') ? '#c62828' : '#2e7d32'
          }}>
            {submitResult}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: isSubmitting ? '#ccc' : '#007bff',
              color: 'white',
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? 'Adding...' : 'Add to Anki'}
          </button>
        </div>
      </div>
    </div>
  );
}; 