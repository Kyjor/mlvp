export const isVideoFile = (file: File): boolean => {
  const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.ogg', '.m4v', '.flv', '.wmv'];
  return videoExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
};

export const isSubtitleFile = (file: File): boolean => {
  const subtitleExtensions = ['.srt', '.vtt', '.ass', '.ssa', '.sub'];
  return subtitleExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
};

// YouTube URL detection and processing
export const isYouTubeUrl = (url: string): boolean => {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i;
  return youtubeRegex.test(url);
};

export const extractYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

export const getYouTubeVideoTitle = async (videoId: string): Promise<string> => {
  try {
    // For now, return a simple title. In a real app, you might want to use the YouTube API
    return `YouTube Video: ${videoId}`;
  } catch (error) {
    console.error('Failed to get YouTube video title:', error);
    return `YouTube Video: ${videoId}`;
  }
}; 