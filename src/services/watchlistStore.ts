import { WatchlistEntry, AnimeItem } from '../types/anime';

const STORAGE_KEY_WATCHLIST = 'animestream_watchlist_v1';

// In-memory cache to prevent repeated synchronous JSON parsing during large grid renders
let watchlistCache: WatchlistEntry[] | null = null;
let watchlistIdSet: Set<string> | null = null;

function rebuildIdSet(list: WatchlistEntry[]): void {
  watchlistIdSet = new Set(list.map((item) => String(item.anime.id)));
}

export function getWatchlist(): WatchlistEntry[] {
  if (watchlistCache) {
    return watchlistCache;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WATCHLIST);
    if (raw) {
      watchlistCache = JSON.parse(raw);
      if (Array.isArray(watchlistCache)) {
        rebuildIdSet(watchlistCache);
        return watchlistCache;
      }
    }
  } catch (e) {
    console.error('Failed to parse watchlist from storage', e);
  }
  watchlistCache = [];
  watchlistIdSet = new Set();
  return watchlistCache;
}

export function saveWatchlist(list: WatchlistEntry[]): void {
  try {
    watchlistCache = list;
    rebuildIdSet(list);
    localStorage.setItem(STORAGE_KEY_WATCHLIST, JSON.stringify(list));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('animestream-watchlist-updated', { detail: list }));
    }
  } catch (e) {
    console.error('Failed to save watchlist', e);
  }
}

export function addToWatchlist(
  anime: AnimeItem,
  status: WatchlistEntry['status'] = 'plan_to_watch'
): WatchlistEntry[] {
  const current = [...getWatchlist()];
  const existingIndex = current.findIndex((item) => String(item.anime.id) === String(anime.id));

  if (existingIndex >= 0) {
    current[existingIndex] = {
      ...current[existingIndex],
      anime,
      status,
      updatedAt: new Date().toISOString(),
    };
  } else {
    current.unshift({
      anime,
      status,
      watchedEpisodes: 0,
      updatedAt: new Date().toISOString(),
    });
  }

  saveWatchlist(current);
  return current;
}

export function updateWatchlistProgress(
  animeId: string | number,
  watchedEpisodes: number,
  status?: WatchlistEntry['status'],
  userRating?: number
): WatchlistEntry[] {
  const current = [...getWatchlist()];
  const index = current.findIndex((item) => String(item.anime.id) === String(animeId));

  if (index >= 0) {
    current[index] = {
      ...current[index],
      watchedEpisodes,
      ...(status ? { status } : {}),
      ...(userRating !== undefined ? { userRating } : {}),
      updatedAt: new Date().toISOString(),
    };
    saveWatchlist(current);
  }
  return current;
}

export function removeFromWatchlist(animeId: string | number): WatchlistEntry[] {
  const current = getWatchlist().filter((item) => String(item.anime.id) !== String(animeId));
  saveWatchlist(current);
  return current;
}

export function isInWatchlist(animeId: string | number): boolean {
  if (!watchlistIdSet) {
    getWatchlist(); // Initializes cache and ID set
  }
  return watchlistIdSet ? watchlistIdSet.has(String(animeId)) : false;
}

export function getWatchlistEntry(animeId: string | number): WatchlistEntry | undefined {
  const list = getWatchlist();
  return list.find((item) => String(item.anime.id) === String(animeId));
}

// React subscription listener for watchlist events
export function subscribeToWatchlistUpdates(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = () => listener();
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY_WATCHLIST) {
      watchlistCache = null;
      watchlistIdSet = null;
      listener();
    }
  };

  window.addEventListener('animestream-watchlist-updated', handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener('animestream-watchlist-updated', handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

