// Convert ASS format to VTT format
export const convertAssToVtt = (assContent: string): string => {
  let vttContent = "WEBVTT\n\n";
  
  const lines = assContent.split('\n');
  let inEventsSection = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if we're in the Events section
    if (trimmedLine === '[Events]') {
      inEventsSection = true;
      continue;
    }
    
    // Stop processing if we hit another section
    if (trimmedLine.startsWith('[') && trimmedLine !== '[Events]') {
      inEventsSection = false;
      continue;
    }
    
    // Process dialogue lines
    if (inEventsSection && trimmedLine.startsWith('Dialogue:')) {
      const parts = trimmedLine.split(',');
      
      if (parts.length >= 10) {
        // ASS format: Dialogue: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
        const startTime = parts[1].trim();
        const endTime = parts[2].trim();
        const text = parts.slice(9).join(',').trim();
        
        // Convert ASS time format (H:MM:SS.CC) to VTT format (HH:MM:SS.CCC)
        const vttStartTime = convertAssTimeToVtt(startTime);
        const vttEndTime = convertAssTimeToVtt(endTime);
        
        // Clean up text (remove ASS formatting tags)
        const cleanText = cleanAssText(text);
        
        if (cleanText) {
          vttContent += `${vttStartTime} --> ${vttEndTime}\n${cleanText}\n\n`;
        }
      }
    }
  }
  
  console.log('Converted ASS to VTT:', vttContent.substring(0, 500) + '...');
  return vttContent;
};

// Convert ASS time format to VTT time format
const convertAssTimeToVtt = (assTime: string): string => {
  // ASS format: H:MM:SS.CC (centiseconds)
  // VTT format: HH:MM:SS.MMM (milliseconds)
  
  const timeParts = assTime.split(':');
  if (timeParts.length !== 3) return assTime;
  
  const hours = timeParts[0].padStart(2, '0');
  const minutes = timeParts[1];
  const secondsParts = timeParts[2].split('.');
  const seconds = secondsParts[0];
  const centiseconds = secondsParts[1] || '00';
  
  // Convert centiseconds to milliseconds
  const milliseconds = (parseInt(centiseconds) * 10).toString().padStart(3, '0');
  
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
};

// Clean ASS text formatting
const cleanAssText = (text: string): string => {
  return text
    .replace(/\{[^}]*\}/g, '') // Remove formatting tags like {\an8}
    .replace(/\\N/g, '\n') // Convert line breaks
    .replace(/\\n/g, '\n') // Convert line breaks
    .replace(/\\h/g, ' ') // Convert hard spaces
    .trim();
};

// Convert SRT format to VTT format
export const convertSrtToVtt = (srtContent: string): string => {
  let vttContent = "WEBVTT\n\n";
  
  // Clean up the content and split by double newlines
  const cleanContent = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = cleanContent.split(/\n\s*\n/);
  
  blocks.forEach((block, _) => {
    const lines = block.trim().split('\n');
    if (lines.length >= 3) {
      // Skip the subtitle number (first line)
      const timeLine = lines[1];
      const textLines = lines.slice(2);
      
      // Convert SRT time format (00:00:20,000 --> 00:00:24,400) to VTT format
      const vttTimeLine = timeLine
        .replace(/,/g, '.') // Replace comma with period in timestamps
        .replace(/\s*-->\s*/g, ' --> '); // Ensure proper arrow format
      
      // Add the cue
      vttContent += `${vttTimeLine}\n${textLines.join('\n')}\n\n`;
    }
  });
  
  console.log('Converted SRT to VTT:', vttContent.substring(0, 500) + '...');
  return vttContent;
}; 