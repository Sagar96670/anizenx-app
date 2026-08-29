const STORAGE_KEY_SEARCH_HISTORY = 'animestream_search_history_v1';
const MAX_HISTORY_ITEMS = 10;

export function getSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SEARCH_HISTORY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item === 'string' && item.trim().length > 0);
      }
    }
  } catch (e) {
    console.error('Failed to get search history from localStorage', e);
  }
  return [];
}

export function saveSearchHistory(history: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SEARCH_HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save search history to localStorage', e);
  }
}

export function addSearchQuery(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return getSearchHistory();
  }

  const current = getSearchHistory();
  // Remove if exists (case-insensitive deduplication, but preserve user's casing or latest casing)
  const filtered = current.filter(
    (item) => item.toLowerCase() !== trimmed.toLowerCase()
  );

  const updated = [trimmed, ...filtered].slice(0, MAX_HISTORY_ITEMS);
  saveSearchHistory(updated);
  return updated;
}

export function removeSearchQuery(queryToRemove: string): string[] {
  const current = getSearchHistory();
  const updated = current.filter(
    (item) => item.toLowerCase() !== queryToRemove.trim().toLowerCase()
  );
  saveSearchHistory(updated);
  return updated;
}

export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_SEARCH_HISTORY);
  } catch (e) {
    console.error('Failed to clear search history', e);
  }
}
