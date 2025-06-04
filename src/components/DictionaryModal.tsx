import React from 'react';

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
  screenshot?: string; // Base64 data URL
  audioData?: string; // Base64 data URL for audio
}

export const DictionaryModal: React.FC<DictionaryModalProps> = ({ open, onClose, word, results, loading, error, sourceText, secondarySourceText, screenshot, audioData }) => {
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

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <h2>Dictionary Lookup: <span style={{color: '#0066cc'}}>{word}</span></h2>
        <button style={closeButtonStyle} onClick={onClose}>×</button>
        
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
              <button 
                style={copyButtonStyle}
                onClick={() => copyAudioToClipboard(audioData)}
                title="Copy audio data URL"
              >
                📋
              </button>
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
              <button 
                style={copyButtonStyle}
                onClick={() => copyImageToClipboard(screenshot)}
                title="Copy screenshot"
              >
                📋
              </button>
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
            <div style={{fontSize: '14px', color: '#666', marginBottom: '4px'}}>
              Primary subtitle:
              <button 
                style={copyButtonStyle}
                onClick={() => copyToClipboard(sourceText)}
                title="Copy primary subtitle"
              >
                📋
              </button>
            </div>
            <div style={{fontSize: '16px', lineHeight: '1.4'}}>
              {highlightWordInText(sourceText, word)}
            </div>
          </div>
        )}

        {/* Secondary subtitle sentence */}
        {secondarySourceText && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#f0f8ff',
            borderRadius: '6px',
            borderLeft: '4px solid #4a90e2'
          }}>
            <div style={{fontSize: '14px', color: '#666', marginBottom: '4px'}}>
              Secondary subtitle:
              <button 
                style={copyButtonStyle}
                onClick={() => copyToClipboard(secondarySourceText)}
                title="Copy secondary subtitle"
              >
                📋
              </button>
            </div>
            <div style={{fontSize: '16px', lineHeight: '1.4'}}>
              {highlightWordInText(secondarySourceText, word)}
            </div>
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
                      <button 
                        style={copyButtonStyle}
                        onClick={() => copyToClipboard(entry.kanji!.map(k => k.text).join(', '))}
                        title="Copy kanji"
                      >
                        📋
                      </button>
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
                    <button 
                      style={copyButtonStyle}
                      onClick={() => copyToClipboard(entry.kana.map(k => k.text).join(', '))}
                      title="Copy reading"
                    >
                      📋
                    </button>
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
                            <button 
                              style={copyButtonStyle}
                              onClick={() => copyToClipboard(meaningText)}
                              title="Copy meanings"
                            >
                              📋
                            </button>
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