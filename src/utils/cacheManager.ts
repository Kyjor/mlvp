import { CachedPlayerData } from '../types';

const CACHE_KEY = 'mlvpPlayerData';

export const savePlayerData = (data: CachedPlayerData): void => {
  try {
    const serializedData = JSON.stringify(data);
    localStorage.setItem(CACHE_KEY, serializedData);
    console.log('Player data saved to cache', data);
  } catch (error) {
    console.error('Error saving player data to localStorage:', error);
  }
};

export const loadPlayerData = (): CachedPlayerData | null => {
  try {
    const serializedData = localStorage.getItem(CACHE_KEY);
    if (serializedData === null) {
      return null;
    }
    const playerData = JSON.parse(serializedData) as CachedPlayerData;
    //console.log('Player data loaded from cache', playerData);
    return playerData;
  } catch (error) {
    console.error('Error loading player data from localStorage:', error);
    return null;
  }
};

export const clearPlayerData = (): void => {
  try {
    localStorage.removeItem(CACHE_KEY);
    //console.log('Player data cleared from cache');
  } catch (error) {
    console.error('Error clearing player data from localStorage:', error);
  }
};

// Utility function for debugging cache status
export const getCacheStatus = (): { hasCache: boolean; videoName?: string; subtitleCount?: number; lastTime?: number } => {
  try {
    const data = loadPlayerData();
    if (!data) {
      return { hasCache: false };
    }
    return {
      hasCache: true,
      videoName: data.videoFileIdentifier || undefined,
      subtitleCount: data.subtitleTracks.length,
      lastTime: data.lastCurrentTime
    };
  } catch (error) {
    console.error('Error checking cache status:', error);
    return { hasCache: false };
  }
}; 