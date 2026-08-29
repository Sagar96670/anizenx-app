import { AnimeItem } from '../types/anime';
import {
  getWatchlist,
  saveWatchlist,
  updateWatchlistProgress,
  addToWatchlist,
  isInWatchlist,
} from './watchlistStore';

const STORAGE_KEY_PROGRESS = 'animestream_episode_progress_v1';

export interface AnimeProgressSummary {
  animeId: string | number;
  watchedEpisodes: number[];
  watchedCount: number;
  totalEpisodes: number;
  percentage: number;
  isCompleted: boolean;
}

// In-memory cache
let progressCache: Record<string, number[]> | null = null;

function loadProgressMap(): Record<string, number[]> {
  if (progressCache) return progressCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (raw) {
      progressCache = JSON.parse(raw);
      return progressCache || {};
    }
  } catch (e) {
    console.error('Failed to parse episode progress from storage', e);
  }
  progressCache = {};
  return progressCache;
}

function saveProgressMap(map: Record<string, number[]>): void {
  try {
    progressCache = map;
    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(map));
    // Dispatch custom event for cross-component reactive updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('animestream-progress-updated', { detail: map }));
    }
  } catch (e) {
    console.error('Failed to save episode progress', e);
  }
}

/**
 * Get progress key encoding season and episode number
 */
export function getEpisodeProgressKey(season = 1, episodeNumber: number): number {
  if (season <= 1) return episodeNumber;
  return season * 1000 + episodeNumber;
}

/**
 * Check if an episode in a specific season is marked as watched
 */
export function isEpisodeProgressWatched(
  animeId: string | number,
  season = 1,
  episodeNumber: number
): boolean {
  const watched = getWatchedEpisodes(animeId);
  const key = getEpisodeProgressKey(season, episodeNumber);
  // Also check basic episodeNumber for season 1 backwards compatibility
  return watched.includes(key) || (season <= 1 && watched.includes(episodeNumber));
}

/**
 * Mark a specific season & episode as watched or unwatched
 */
export function setEpisodeProgressWatched(
  anime: AnimeItem,
  season = 1,
  episodeNumber: number,
  watched: boolean
): number[] {
  const map = { ...loadProgressMap() };
  const key = String(anime.id);
  const currentWatched = new Set<number>(map[key] || []);
  const epKey = getEpisodeProgressKey(season, episodeNumber);

  if (watched) {
    currentWatched.add(epKey);
    if (season <= 1) currentWatched.add(episodeNumber);
  } else {
    currentWatched.delete(epKey);
    if (season <= 1) currentWatched.delete(episodeNumber);
  }

  const updatedArray = Array.from(currentWatched).sort((a, b) => a - b);
  map[key] = updatedArray;
  saveProgressMap(map);

  syncWithWatchlist(anime, updatedArray);

  return updatedArray;
}

/**
 * Toggle watched status for an episode in a specific season
 */
export function toggleEpisodeProgressWatched(
  anime: AnimeItem,
  season = 1,
  episodeNumber: number
): { isWatched: boolean; watchedEpisodes: number[] } {
  const isCurrentlyWatched = isEpisodeProgressWatched(anime.id, season, episodeNumber);
  const newWatchedState = !isCurrentlyWatched;
  const updatedEpisodes = setEpisodeProgressWatched(anime, season, episodeNumber, newWatchedState);

  return {
    isWatched: newWatchedState,
    watchedEpisodes: updatedEpisodes,
  };
}

/**
 * Mark all episodes of a specific season as watched or unwatched
 */
export function markSeasonEpisodesWatched(
  anime: AnimeItem,
  season = 1,
  seasonEpisodesCount: number,
  watched: boolean
): number[] {
  const map = { ...loadProgressMap() };
  const key = String(anime.id);
  const currentWatched = new Set<number>(map[key] || []);

  for (let i = 1; i <= seasonEpisodesCount; i++) {
    const epKey = getEpisodeProgressKey(season, i);
    if (watched) {
      currentWatched.add(epKey);
      if (season <= 1) currentWatched.add(i);
    } else {
      currentWatched.delete(epKey);
      if (season <= 1) currentWatched.delete(i);
    }
  }

  const updatedArray = Array.from(currentWatched).sort((a, b) => a - b);
  map[key] = updatedArray;
  saveProgressMap(map);

  syncWithWatchlist(anime, updatedArray);

  return updatedArray;
}

/**
 * Get the list of watched episode numbers for a specific anime
 */
export function getWatchedEpisodes(animeId: string | number): number[] {
  const map = loadProgressMap();
  const key = String(animeId);
  return map[key] || [];
}

/**
 * Check if a specific episode number is marked as watched
 */
export function isEpisodeWatched(animeId: string | number, episodeNumber: number): boolean {
  const watched = getWatchedEpisodes(animeId);
  return watched.includes(episodeNumber);
}

/**
 * Mark a specific episode as watched or unwatched
 */
export function setEpisodeWatched(
  anime: AnimeItem,
  episodeNumber: number,
  watched: boolean
): number[] {
  const map = { ...loadProgressMap() };
  const key = String(anime.id);
  const currentWatched = new Set<number>(map[key] || []);

  if (watched) {
    currentWatched.add(episodeNumber);
  } else {
    currentWatched.delete(episodeNumber);
  }

  const updatedArray = Array.from(currentWatched).sort((a, b) => a - b);
  map[key] = updatedArray;
  saveProgressMap(map);

  // Synchronize with Watchlist
  syncWithWatchlist(anime, updatedArray);

  return updatedArray;
}

/**
 * Toggle watched status for an episode
 */
export function toggleEpisodeWatched(
  anime: AnimeItem,
  episodeNumber: number
): { isWatched: boolean; watchedEpisodes: number[] } {
  const isCurrentlyWatched = isEpisodeWatched(anime.id, episodeNumber);
  const newWatchedState = !isCurrentlyWatched;
  const updatedEpisodes = setEpisodeWatched(anime, episodeNumber, newWatchedState);

  return {
    isWatched: newWatchedState,
    watchedEpisodes: updatedEpisodes,
  };
}

/**
 * Mark all episodes up to totalCount as watched or unwatched
 */
export function markAllEpisodesWatched(
  anime: AnimeItem,
  totalEpisodes: number,
  watched: boolean
): number[] {
  const map = { ...loadProgressMap() };
  const key = String(anime.id);

  let updatedArray: number[] = [];
  if (watched && totalEpisodes > 0) {
    updatedArray = Array.from({ length: totalEpisodes }, (_, i) => i + 1);
  }

  map[key] = updatedArray;
  saveProgressMap(map);

  syncWithWatchlist(anime, updatedArray);

  return updatedArray;
}

/**
 * Calculate progress summary for an anime
 */
export function getAnimeProgress(
  animeId: string | number,
  totalEpisodesCount?: number
): AnimeProgressSummary {
  const watched = getWatchedEpisodes(animeId);
  const total = totalEpisodesCount && totalEpisodesCount > 0 ? totalEpisodesCount : 0;
  const watchedCount = watched.length;

  let percentage = 0;
  if (total > 0) {
    percentage = Math.min(100, Math.round((watchedCount / total) * 100));
  } else if (watchedCount > 0) {
    percentage = 100;
  }

  const isCompleted = total > 0 && watchedCount >= total;

  return {
    animeId,
    watchedEpisodes: watched,
    watchedCount,
    totalEpisodes: total,
    percentage,
    isCompleted,
  };
}

/**
 * Internal sync with watchlist entries
 */
function syncWithWatchlist(anime: AnimeItem, watchedEpisodes: number[]): void {
  const count = watchedEpisodes.length;
  const total = anime.episodes || 0;

  if (isInWatchlist(anime.id)) {
    const isCompleted = total > 0 && count >= total;
    const newStatus = isCompleted ? 'completed' : count > 0 ? 'watching' : undefined;
    updateWatchlistProgress(anime.id, count, newStatus);
  } else if (count > 0) {
    // Automatically add to watchlist as 'watching' or 'completed'
    const status = total > 0 && count >= total ? 'completed' : 'watching';
    addToWatchlist(anime, status);
    updateWatchlistProgress(anime.id, count, status);
  }
}

/**
 * Subscribe to progress updates for React components
 */
export function subscribeToProgressUpdates(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = () => listener();
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY_PROGRESS) {
      progressCache = null;
      listener();
    }
  };

  window.addEventListener('animestream-progress-updated', handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener('animestream-progress-updated', handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}
