// Video file extensions that we want to support
const supportedVideoExtensions = [
  '.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.m4v', '.3gp', '.flv', '.wmv'
];

// Subtitle file extensions
const supportedSubtitleExtensions = [
  '.srt', '.vtt', '.ass', '.ssa', '.sub'
];

export const isVideoFile = (file: File): boolean => {
  if (file.type.startsWith('video/')) {
    return true;
  }
  const fileName = file.name.toLowerCase();
  return supportedVideoExtensions.some(ext => fileName.endsWith(ext));
};

export const isSubtitleFile = (file: File): boolean => {
  const fileName = file.name.toLowerCase();
  return supportedSubtitleExtensions.some(ext => fileName.endsWith(ext));
}; 