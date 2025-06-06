import React, { useState } from 'react';
import { AnkiNote, AnkiNoteWithMedia, SubtitleCue } from '../types';

interface JMDictEntry {
  id: number;
  kanji?: Array<{
    common?: boolean;
    text: string;
    tags: string[];
  }>;
  kana: Array<{
    common?: boolean;
    text: string;
    tags: string[];
    appliesToKanji?: string[];
  }>;
  sense: Array<{
    partOfSpeech: string[];
    appliesToKanji?: string[];
    appliesToKana?: string[];
    gloss: Array<{
      lang: string;
      text: string;
    }>;
    info?: string[];
  }>;
}

export interface DictionaryModalProps {
  open: boolean;
  onClose: () => void;
  word: string;
  results: JMDictEntry[];
  loading: boolean;
  error?: string;
  sourceText?: string;
  secondarySourceText?: string;
  secondarySubtitleCues?: SubtitleCue[]; // Array of all secondary subtitle cues
  currentTime?: number; // Current video time to find initial secondary subtitle
  secondarySubtitleOffset?: number; // Offset for secondary subtitles
  screenshot?: string; // Base64 data URL
  audioData?: string; // Base64 data URL for audio
  // Anki integration props
  onOpenAnkiModal?: (noteWithMedia: AnkiNoteWithMedia) => void;
}

export const DictionaryModal: React.FC<DictionaryModalProps> = ({ 
  open, 
  onClose, 
  word, 
  results, 
  loading, 
  error, 
  sourceText, 
  secondarySourceText, 
  secondarySubtitleCues,
  currentTime,
  secondarySubtitleOffset = 0,
  screenshot, 
  audioData,
  onOpenAnkiModal
}) => {
  // Field mapping state
  const [fieldMappings, setFieldMappings] = useState<Record<string, keyof AnkiNote>>({});
  
  // Translation state
  const [sentenceTranslation, setSentenceTranslation] = useState<string>('');
  const [wordTranslation, setWordTranslation] = useState<string>('');
  const [isTranslatingSentence, setIsTranslatingSentence] = useState(false);
  const [isTranslatingWord, setIsTranslatingWord] = useState(false);

  // Secondary subtitle navigation state
  const [selectedSecondaryIndex, setSelectedSecondaryIndex] = useState<number | null>(null);

  // Find the current secondary subtitle index based on current time
  const getCurrentSecondaryIndex = (): number => {
    if (!secondarySubtitleCues || !currentTime) return -1;
    
    const adjustedTime = currentTime + secondarySubtitleOffset;
    for (let i = 0; i < secondarySubtitleCues.length; i++) {
      if (adjustedTime >= secondarySubtitleCues[i].startTime && adjustedTime <= secondarySubtitleCues[i].endTime) {
        return i;
      }
    }
    return -1;
  };

  // Initialize selected index on first render
  React.useEffect(() => {
    if (selectedSecondaryIndex === null && secondarySubtitleCues) {
      const currentIndex = getCurrentSecondaryIndex();
      setSelectedSecondaryIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  }, [secondarySubtitleCues, currentTime]);

  // Reset selected index when modal opens or secondary cues change
  React.useEffect(() => {
    if (open && secondarySubtitleCues) {
      const currentIndex = getCurrentSecondaryIndex();
      setSelectedSecondaryIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  }, [open, secondarySubtitleCues]);

  // Get the currently selected secondary subtitle text
  const getSelectedSecondaryText = (): string => {
    if (!secondarySubtitleCues || selectedSecondaryIndex === null || selectedSecondaryIndex < 0) {
      return secondarySourceText || '';
    }
    
    if (selectedSecondaryIndex >= secondarySubtitleCues.length) {
      return secondarySourceText || '';
    }
    
    return secondarySubtitleCues[selectedSecondaryIndex].text;
  };

  // Navigate to previous secondary subtitle
  const navigateToPreviousSecondary = () => {
    if (!secondarySubtitleCues || selectedSecondaryIndex === null) return;
    
    const newIndex = Math.max(0, selectedSecondaryIndex - 1);
    setSelectedSecondaryIndex(newIndex);
  };

  // Navigate to next secondary subtitle
  const navigateToNextSecondary = () => {
    if (!secondarySubtitleCues || selectedSecondaryIndex === null) return;
    
    const newIndex = Math.min(secondarySubtitleCues.length - 1, selectedSecondaryIndex + 1);
    setSelectedSecondaryIndex(newIndex);
  };

  // Get the display text for the selected secondary subtitle
  const selectedSecondaryText = getSelectedSecondaryText();

  if (!open) return null;
  
  // Helper function to copy text to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Translation function using MyMemory API
  const translateText = async (text: string, setTranslation: (translation: string) => void, setLoading: (loading: boolean) => void) => {
    if (!text.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ja|en`);
      const data = await response.json();
      
      if (data.responseStatus === 200 && data.responseData) {
        setTranslation(data.responseData.translatedText);
      } else {
        setTranslation('Translation failed');
      }
    } catch (err) {
      console.error('Translation error:', err);
      setTranslation('Translation error');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to copy image to clipboard
  const copyImageToClipboard = async (dataUrl: string) => {
    try {
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
    } catch (err) {
      console.error('Failed to copy image to clipboard:', err);
    }
  };

  // Helper function to copy audio to clipboard
  const copyAudioToClipboard = async (dataUrl: string) => {
    try {
      // Copy audio as text (data URL) since audio clipboard support is limited
      await navigator.clipboard.writeText(dataUrl);
    } catch (err) {
      console.error('Failed to copy audio to clipboard:', err);
    }
  };

  // Helper function to copy audio as HTML component
  const copyAudioAsHtml = async (dataUrl: string) => {
    try {
      // Convert data URL to blob URL
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Generate timestamp-based ID
      const timestamp = Date.now();
      const audioId = `audio-cont-${timestamp}`;
      const filename = `${timestamp}.wav`;
      
      // Create the HTML string with the specified format
      const htmlString = `<img class="audio-container audio-play" data-url="${blobUrl}" title="${filename}" id="${audioId}" data-suffix="wav" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' style='width:24px;height:24px' viewBox='0 0 24 24'%3E%3C/svg%3E">`;
      
      await navigator.clipboard.writeText(htmlString);
    } catch (err) {
      console.error('Failed to copy audio HTML to clipboard:', err);
    }
  };

  // Helper to highlight the word in the source text with bold
  const highlightWordInText = (text: string, wordToHighlight: string): JSX.Element => {
    if (!text || !wordToHighlight) {
      return <span>{text}</span>;
    }
    
    const parts = text.split(new RegExp(`(${wordToHighlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, index) => 
          part.toLowerCase() === wordToHighlight.toLowerCase() ? 
            <strong key={index}>{part}</strong> : 
            <span key={index}>{part}</span>
        )}
      </span>
    );
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
    zIndex: 10000,
    padding: '20px'
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '800px',
    maxHeight: '90vh',
    width: '100%',
    overflow: 'auto',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
    position: 'relative'
  };

  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px 8px'
  };

  const copyButtonStyle: React.CSSProperties = {
    background: '#f0f0f0',
    border: '1px solid #ccc',
    borderRadius: '4px',
    padding: '2px 6px',
    cursor: 'pointer',
    fontSize: '12px',
    marginLeft: '8px',
    color: '#666'
  };

  // Anki field dropdown component
  const AnkiFieldDropdown: React.FC<{ contentKey: string; onCopy: () => void; content: string }> = ({ contentKey, onCopy, content }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const ankiFields: Array<{ key: keyof AnkiNote; label: string }> = [
      { key: 'sentence', label: 'Sentence' },
      { key: 'translation', label: 'Translation' },
      { key: 'targetWord', label: 'Target Word' },
      { key: 'definitions', label: 'Definitions' }
    ];

    const handleFieldSelect = (field: keyof AnkiNote) => {
      setFieldMappings(prev => ({ ...prev, [contentKey]: field }));
      setIsOpen(false);
      // Auto-copy to clipboard when field is selected
      copyToClipboard(content);
    };

    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button 
          style={{
            ...copyButtonStyle,
            backgroundColor: fieldMappings[contentKey] ? '#e8f5e8' : '#f0f0f0',
            color: fieldMappings[contentKey] ? '#2e7d32' : '#666'
          }}
          onClick={onCopy}
          title="Copy to clipboard"
        >
          📋
        </button>
        <button
          style={{
            ...copyButtonStyle,
            marginLeft: '2px',
            backgroundColor: '#e3f2fd',
            color: '#1976d2'
          }}
          onClick={() => setIsOpen(!isOpen)}
          title="Set Anki field"
        >
          📚▼
        </button>
        {isOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            zIndex: 1000,
            minWidth: '120px'
          }}>
            {ankiFields.map(field => (
              <button
                key={field.key}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '6px 12px',
                  border: 'none',
                  backgroundColor: fieldMappings[contentKey] === field.key ? '#e8f5e8' : 'white',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                onClick={() => handleFieldSelect(field.key)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = fieldMappings[contentKey] === field.key ? '#e8f5e8' : 'white'}
              >
                {field.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Generate Anki note from current mappings
  const generateAnkiNote = (): Partial<AnkiNote> => {
    const note: Partial<AnkiNote> = {};
    
    // Helper function to wrap target word with bold tags in text
    const wrapTargetWordInText = (text: string, targetWord: string): string => {
      if (!text || !targetWord) return text;
      
      // Use case-insensitive replacement with global flag
      const regex = new RegExp(`(${targetWord})`, 'gi');
      return text.replace(regex, '<b>$1</b>');
    };
    
    // Auto-populate default fields first
    // Primary subtitle -> Sentence (with target word bolded)
    if (sourceText) {
      note.sentence = wrapTargetWordInText(sourceText, word);
    }
    
    // Secondary subtitle -> Translation (use selected secondary text)
    if (selectedSecondaryText) {
      note.translation = selectedSecondaryText;
    }
    
    // Target word -> First dictionary entry as "[Reading] [Kanji]"
    if (results.length > 0) {
      const entry = results[0];
      const reading = entry.kana[0]?.text || '';
      const kanji = entry.kanji?.[0]?.text || '';
      
      if (reading && kanji) {
        note.targetWord = `[${reading}] [${kanji}]`;
      } else if (reading) {
        note.targetWord = `[${reading}]`;
      } else if (kanji) {
        note.targetWord = `[${kanji}]`;
      }
    }
    
    // Definition -> First dictionary definition
    if (results.length > 0) {
      const entry = results[0];
      const englishSenses = entry.sense.filter(sense => 
        sense.gloss.some(g => g.lang === 'eng' || !g.lang)
      );
      if (englishSenses.length > 0) {
        const firstSense = englishSenses[0];
        note.definitions = firstSense.gloss
          .filter(g => g.lang === 'eng' || !g.lang)
          .map(gloss => gloss.text)
          .join(', ');
      }
    }
    
    // Then apply any manual field mappings (this will override defaults if user has mapped fields)
    Object.entries(fieldMappings).forEach(([contentKey, field]) => {
      let content = '';
      switch (contentKey) {
        case 'sourceText':
          // Also apply bold wrapping for manual mappings to sentence field
          content = field === 'sentence' ? wrapTargetWordInText(sourceText || '', word) : (sourceText || '');
          break;
        case 'secondarySourceText':
          content = selectedSecondaryText || '';
          break;
        case 'word':
          content = word;
          break;
        case 'meanings':
          // Get meanings from first result
          if (results.length > 0) {
            const entry = results[0];
            const englishSenses = entry.sense.filter(sense => 
              sense.gloss.some(g => g.lang === 'eng' || !g.lang)
            );
            content = englishSenses.map(sense => 
              sense.gloss.filter(g => g.lang === 'eng' || !g.lang)
                .map(gloss => gloss.text).join(', ')
            ).join('; ');
          }
          break;
        case 'kanji':
          if (results.length > 0 && results[0].kanji) {
            content = results[0].kanji.map(k => k.text).join(', ');
          }
          break;
        case 'reading':
          if (results.length > 0) {
            content = results[0].kana.map(k => k.text).join(', ');
          }
          break;
      }
      if (content) {
        note[field] = content;
      }
    });

    return note;
  };

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <h2>Dictionary Lookup: <span style={{color: '#0066cc'}}>{word}</span></h2>
        <button style={closeButtonStyle} onClick={onClose}>×</button>
        
        {/* Add to Anki button */}
        {onOpenAnkiModal && (
          <div style={{ marginBottom: '12px', textAlign: 'right' }}>
            <button
              style={{
                padding: '8px 16px',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onClick={() => onOpenAnkiModal({
                sentence: generateAnkiNote().sentence ?? "",
                translation: generateAnkiNote().translation ?? "",
                targetWord: generateAnkiNote().targetWord ?? "",
                definitions: generateAnkiNote().definitions ?? "",
                sentenceAudio: generateAnkiNote().sentenceAudio,
                wordAudio: generateAnkiNote().wordAudio,
                screenshot,
                audioData
              })}
              title="Open Anki modal with mapped fields"
            >
              📚 Add to Anki
            </button>
          </div>
        )}
        
        {/* Audio */}
        {audioData && (
          <div style={{
            marginBottom: '12px',
            padding: '12px',
            backgroundColor: '#f0fff0',
            borderRadius: '6px',
            borderLeft: '4px solid #28a745'
          }}>
            <div style={{fontSize: '14px', color: '#666', marginBottom: '8px'}}>
              Sentence audio:
              <AnkiFieldDropdown 
                contentKey="audioData" 
                onCopy={() => copyAudioToClipboard(audioData)} 
                content={audioData}
              />
              <button 
                style={{...copyButtonStyle, marginLeft: '4px'}}
                onClick={() => copyAudioAsHtml(audioData)}
                title="Copy as HTML audio component"
              >
                🎵
              </button>
            </div>
            <audio 
              controls 
              src={audioData}
              style={{
                width: '100%',
                height: '40px'
              }}
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        {/* Screenshot */}
        {screenshot && (
          <div style={{
            marginBottom: '12px',
            padding: '12px',
            backgroundColor: '#fafafa',
            borderRadius: '6px',
            borderLeft: '4px solid #ff6b35'
          }}>
            <div style={{fontSize: '14px', color: '#666', marginBottom: '8px'}}>
              Video frame:
              <AnkiFieldDropdown 
                contentKey="screenshot" 
                onCopy={() => copyImageToClipboard(screenshot)} 
                content="[Screenshot]"
              />
            </div>
            <img 
              src={screenshot} 
              alt="Video frame screenshot"
              style={{
                maxWidth: '100%',
                height: 'auto',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            />
          </div>
        )}

        {/* Primary subtitle sentence */}
        {sourceText && (
          <div style={{
            marginBottom: '12px',
            padding: '12px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            borderLeft: '4px solid #0066cc'
          }}>
            <div style={{fontSize: '14px', color: '#666', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <span>
                Primary subtitle:
                <AnkiFieldDropdown 
                  contentKey="sourceText" 
                  onCopy={() => copyToClipboard(sourceText)} 
                  content={sourceText}
                />
              </span>
              <button
                style={{
                  ...copyButtonStyle,
                  backgroundColor: '#e3f2fd',
                  color: '#1976d2',
                  border: '1px solid #1976d2'
                }}
                onClick={() => translateText(sourceText, setSentenceTranslation, setIsTranslatingSentence)}
                disabled={isTranslatingSentence}
                title="Translate sentence"
              >
                {isTranslatingSentence ? '⏳' : '🌐'} Translate
              </button>
            </div>
            <div style={{fontSize: '16px', lineHeight: '1.4', marginBottom: sentenceTranslation ? '8px' : '0'}}>
              {highlightWordInText(sourceText, word)}
            </div>
            {sentenceTranslation && (
              <div style={{
                fontSize: '14px',
                color: '#555',
                fontStyle: 'italic',
                backgroundColor: '#e8f5e8',
                padding: '6px 8px',
                borderRadius: '4px',
                marginTop: '8px'
              }}>
                Translation: {sentenceTranslation}
                <button 
                  style={{...copyButtonStyle, marginLeft: '8px'}}
                  onClick={() => copyToClipboard(sentenceTranslation)}
                  title="Copy translation"
                >
                  📋
                </button>
              </div>
            )}
          </div>
        )}

        {/* Secondary subtitle sentence */}
        {(selectedSecondaryText || secondarySourceText) && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#f0f8ff',
            borderRadius: '6px',
            borderLeft: '4px solid #4a90e2'
          }}>
            <div style={{fontSize: '14px', color: '#666', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <span>
                Secondary subtitle:
                <AnkiFieldDropdown 
                  contentKey="secondarySourceText" 
                  onCopy={() => copyToClipboard(selectedSecondaryText)} 
                  content={selectedSecondaryText}
                />
              </span>
              {/* Navigation arrows for secondary subtitles */}
              {secondarySubtitleCues && secondarySubtitleCues.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    style={{
                      ...copyButtonStyle,
                      backgroundColor: '#e3f2fd',
                      color: '#1976d2',
                      border: '1px solid #1976d2',
                      padding: '4px 8px'
                    }}
                    onClick={navigateToPreviousSecondary}
                    disabled={selectedSecondaryIndex === null || selectedSecondaryIndex <= 0}
                    title="Previous secondary subtitle"
                  >
                    ←
                  </button>
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#666', 
                    minWidth: '60px', 
                    textAlign: 'center' 
                  }}>
                    {selectedSecondaryIndex !== null && secondarySubtitleCues ? 
                      `${selectedSecondaryIndex + 1}/${secondarySubtitleCues.length}` : 
                      '1/1'
                    }
                  </span>
                  <button
                    style={{
                      ...copyButtonStyle,
                      backgroundColor: '#e3f2fd',
                      color: '#1976d2',
                      border: '1px solid #1976d2',
                      padding: '4px 8px'
                    }}
                    onClick={navigateToNextSecondary}
                    disabled={selectedSecondaryIndex === null || !secondarySubtitleCues || selectedSecondaryIndex >= secondarySubtitleCues.length - 1}
                    title="Next secondary subtitle"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
            <div style={{fontSize: '16px', lineHeight: '1.4'}}>
              {highlightWordInText(selectedSecondaryText, word)}
            </div>
          </div>
        )}

        {/* Target word translation section */}
        {word && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#fff3e0',
            borderRadius: '6px',
            borderLeft: '4px solid #ff9800'
          }}>
            <div style={{fontSize: '14px', color: '#666', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <span>Target word: <strong style={{fontSize: '16px', color: '#333'}}>{word}</strong></span>
              <button
                style={{
                  ...copyButtonStyle,
                  backgroundColor: '#e3f2fd',
                  color: '#1976d2',
                  border: '1px solid #1976d2'
                }}
                onClick={() => translateText(word, setWordTranslation, setIsTranslatingWord)}
                disabled={isTranslatingWord}
                title="Translate word"
              >
                {isTranslatingWord ? '⏳' : '🌐'} Translate
              </button>
            </div>
            {wordTranslation && (
              <div style={{
                fontSize: '14px',
                color: '#555',
                fontStyle: 'italic',
                backgroundColor: '#e8f5e8',
                padding: '6px 8px',
                borderRadius: '4px',
                marginTop: '8px'
              }}>
                Translation: {wordTranslation}
                <button 
                  style={{...copyButtonStyle, marginLeft: '8px'}}
                  onClick={() => copyToClipboard(wordTranslation)}
                  title="Copy translation"
                >
                  📋
                </button>
              </div>
            )}
          </div>
        )}
        
        {loading && <div style={{padding: '20px', textAlign: 'center'}}>Loading...</div>}
        {error && <div style={{color: 'red', padding: '10px', background: '#ffebee', borderRadius: '4px'}}>Error: {error}</div>}
        
        {!loading && !error && results.length === 0 && (
          <div style={{padding: '20px', textAlign: 'center', color: '#666'}}>No results found for "{word}"</div>
        )}
        
        {!loading && !error && results.length > 0 && (
          <div style={{marginTop: '16px'}}>
            {results.slice(0, 3).map((entry, index) => {
              // Filter senses to only include those with English glosses
              const englishSenses = entry.sense.filter(sense => 
                sense.gloss.some(g => g.lang === 'eng' || !g.lang)
              );
              
              // Skip entries with no English senses
              if (englishSenses.length === 0) return null;
              
              return (
                <div key={entry.id || index} style={{
                  borderBottom: index < Math.min(results.length, 3) - 1 ? '1px solid #eee' : 'none',
                  paddingBottom: '16px',
                  marginBottom: '16px'
                }}>
                  {/* Kanji */}
                  {entry.kanji && entry.kanji.length > 0 && (
                    <div style={{marginBottom: '8px'}}>
                      <strong>Kanji: </strong>
                      {entry.kanji.map((k, i) => (
                        <span key={i} style={{
                          fontWeight: k.common ? 'bold' : 'normal',
                          color: k.common ? '#0066cc' : 'inherit',
                          fontSize: '1.1em'
                        }}>
                          {k.text}
                          {i < entry.kanji!.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                      <AnkiFieldDropdown 
                        contentKey="kanji" 
                        onCopy={() => copyToClipboard(entry.kanji!.map(k => k.text).join(', '))} 
                        content={entry.kanji!.map(k => k.text).join(', ')}
                      />
                    </div>
                  )}
                  
                  {/* Kana */}
                  <div style={{marginBottom: '8px'}}>
                    <strong>Reading: </strong>
                    {entry.kana.map((k, i) => (
                      <span key={i} style={{
                        fontWeight: k.common ? 'bold' : 'normal',
                        color: k.common ? '#0066cc' : 'inherit',
                        fontSize: '1.1em'
                      }}>
                        {k.text}
                        {i < entry.kana.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                    <AnkiFieldDropdown 
                      contentKey="reading" 
                      onCopy={() => copyToClipboard(entry.kana.map(k => k.text).join(', '))} 
                      content={entry.kana.map(k => k.text).join(', ')}
                    />
                  </div>
                  
                  {/* Meanings - Only English */}
                  <div>
                    <strong>Meanings:</strong>
                    {englishSenses.map((sense, senseIndex) => {
                      const englishGlosses = sense.gloss.filter(g => g.lang === 'eng' || !g.lang);
                      const meaningText = englishGlosses.map(gloss => gloss.text).join(', ');
                      
                      return (
                        <div key={senseIndex} style={{marginLeft: '16px', marginTop: '8px'}}>
                          {sense.partOfSpeech && sense.partOfSpeech.length > 0 && (
                            <div style={{
                              fontSize: '0.9em',
                              color: '#666',
                              fontStyle: 'italic',
                              marginBottom: '4px'
                            }}>
                              ({sense.partOfSpeech.join(', ')})
                            </div>
                          )}
                          <div style={{marginLeft: '8px', display: 'flex', alignItems: 'center'}}>
                            <span style={{flex: 1}}>{meaningText}</span>
                            <AnkiFieldDropdown 
                              contentKey={`meanings-${senseIndex}`} 
                              onCopy={() => copyToClipboard(meaningText)} 
                              content={meaningText}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            {results.length > 3 && (
              <div style={{
                textAlign: 'center',
                color: '#666',
                fontStyle: 'italic',
                marginTop: '8px'
              }}>
                ... and {results.length - 3} more results
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 