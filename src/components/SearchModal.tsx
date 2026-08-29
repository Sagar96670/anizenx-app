import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  History,
  TrendingUp,
  Clock,
  Trash2,
  Flame,
  Star,
  Sparkles,
  ArrowLeft,
  Filter,
} from 'lucide-react';
import { AnimeItem, AnimeGenre } from '../types/anime';
import { searchAnime } from '../services/animeApi';
import { AnimeCard } from './AnimeCard';
import {
  getSearchHistory,
  addSearchQuery,
  removeSearchQuery,
  clearSearchHistory,
} from '../services/searchHistoryStore';

const TRENDING_TAGS = [
  'Solo Leveling',
  'Demon Slayer',
  'Jujutsu Kaisen',
  'One Piece',
  'Attack on Titan',
  'Bleach',
  'Chainsaw Man',
  'Naruto',
  'Death Note',
  'Spy x Family',
  'Liar Game',
  'Captain Tsubasa',
  'Frieren',
  'Dragon Ball',
  'Hunter x Hunter',
  'My Hero Academia',
];

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAnime: (anime: AnimeItem) => void;
  onWatchTrailer?: (anime: AnimeItem) => void;
  onWatchlistChanged?: () => void;
  trendingAnime?: AnimeItem[];
  genres?: AnimeGenre[];
  initialQuery?: string;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectAnime,
  onWatchTrailer,
  onWatchlistChanged,
  trendingAnime = [],
  genres = [],
  initialQuery = '',
}) => {
  const [query, setQuery] = useState<string>(initialQuery);
  const [results, setResults] = useState<AnimeItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync initial query and focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchHistory(getSearchHistory());
      if (initialQuery) {
        setQuery(initialQuery);
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSelectedGenreId(null);
    }
  }, [isOpen, initialQuery]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search logic
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed && !selectedGenreId) {
      setResults([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setHasSearched(true);
      try {
        const params: { genres?: number[]; limit: number } = { limit: 30 };
        if (selectedGenreId) {
          params.genres = [selectedGenreId];
        }
        const res = await searchAnime(trimmed, params);
        setResults(res.data || []);
      } catch (err) {
        console.error('Search failed in modal', err);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query, selectedGenreId]);

  if (!isOpen) return null;

  const handleSelectHistory = (historyItem: string) => {
    setQuery(historyItem);
    const updated = addSearchQuery(historyItem);
    setSearchHistory(updated);
  };

  const handleRemoveHistory = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    const updated = removeSearchQuery(item);
    setSearchHistory(updated);
  };

  const handleClearAllHistory = () => {
    clearSearchHistory();
    setSearchHistory([]);
  };

  const handleSelectTag = (tag: string) => {
    setQuery(tag);
    const updated = addSearchQuery(tag);
    setSearchHistory(updated);
  };

  const handleAnimeClick = (anime: AnimeItem) => {
    if (query.trim().length >= 2) {
      addSearchQuery(query.trim());
    }
    // 1. Immediately close the Search Overlay Modal
    onClose();
    // 2. Trigger navigation to the anime details
    onSelectAnime(anime);
  };

  const handleClearInput = () => {
    setQuery('');
    setSelectedGenreId(null);
    setResults([]);
    setHasSearched(false);
    inputRef.current?.focus();
  };

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim().length >= 2) {
      const updated = addSearchQuery(query.trim());
      setSearchHistory(updated);
    }
  };

  return (
    <div
      id="search-overlay-modal"
      className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-2xl flex flex-col text-neutral-100 animate-fadeIn overflow-hidden"
    >
      {/* Search Header Bar */}
      <div className="w-full bg-neutral-900/90 border-b border-neutral-800/90 px-3 sm:px-6 py-3 sm:py-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center gap-2 sm:gap-4">
          {/* Back / Close Icon */}
          <button
            id="close-search-modal-back-btn"
            onClick={onClose}
            className="p-2 sm:p-2.5 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
            title="Close Search (ESC)"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Search Input Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              id="search-overlay-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDownInput}
              placeholder="Search anime by title, character, or keyword (e.g. Solo Leveling, Liar Game)..."
              className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-3.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 focus:border-rose-500 rounded-xl sm:rounded-2xl text-xs sm:text-base text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-500/40 transition-all font-medium"
            />
            {query && (
              <button
                id="clear-overlay-search-btn"
                onClick={handleClearInput}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Close Pill Button */}
          <button
            id="close-search-modal-btn"
            onClick={onClose}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl text-xs font-bold border border-neutral-700 transition-colors cursor-pointer shrink-0"
          >
            <span>Close</span>
            <kbd className="px-1.5 py-0.5 bg-neutral-900 text-neutral-400 rounded text-[10px] font-mono">
              ESC
            </kbd>
          </button>
        </div>

        {/* Optional Quick Genre Filter Chips */}
        {genres.length > 0 && (
          <div className="max-w-6xl mx-auto mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs">
            <span className="text-[11px] font-bold text-neutral-500 flex items-center gap-1 shrink-0 mr-1">
              <Filter className="w-3 h-3 text-rose-500" />
              Filter:
            </span>
            <button
              onClick={() => setSelectedGenreId(null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedGenreId === null
                  ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                  : 'bg-neutral-800/80 text-neutral-400 hover:text-white'
              }`}
            >
              All Genres
            </button>
            {genres.slice(0, 12).map((g) => {
              const isSelected = selectedGenreId === g.mal_id;
              return (
                <button
                  key={g.mal_id || g.name}
                  onClick={() => setSelectedGenreId(isSelected ? null : (g.mal_id || null))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30 font-bold'
                      : 'bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-700'
                  }`}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
          {/* STATE 1: ACTIVE TYPING / SEARCH RESULTS */}
          {hasSearched || query.trim().length > 0 || selectedGenreId !== null ? (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Search className="w-4 h-4 text-rose-500" />
                    <span>Search Results</span>
                  </h3>
                  {isSearching ? (
                    <div className="flex items-center gap-2 text-xs text-rose-400 font-mono">
                      <div className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                      <span>Searching live catalog...</span>
                    </div>
                  ) : (
                    <span className="text-xs text-neutral-400 font-medium">
                      ({results.length} {results.length === 1 ? 'title' : 'titles'} found)
                    </span>
                  )}
                </div>

                {query && (
                  <span className="text-xs text-neutral-400 font-mono truncate max-w-[200px]">
                    for "{query}"
                  </span>
                )}
              </div>

              {/* Loading State */}
              {isSearching && results.length === 0 && (
                <div className="py-16 text-center text-neutral-400 space-y-3">
                  <div className="w-10 h-10 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm">Fetching matching anime from your live backend...</p>
                </div>
              )}

              {/* No Results State */}
              {!isSearching && results.length === 0 && (
                <div className="py-12 px-4 bg-neutral-900/50 border border-neutral-800/80 rounded-2xl text-center space-y-4">
                  <div className="w-14 h-14 bg-neutral-800/80 rounded-full flex items-center justify-center mx-auto text-neutral-500">
                    <Search className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">
                      No results found for "{query}"
                    </h4>
                    <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-md mx-auto">
                      Try searching with fewer keywords, check for spelling errors, or explore popular tags below.
                    </p>
                  </div>

                  {/* Suggestion Tags */}
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-neutral-400 mb-2">Try searching for:</p>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-lg mx-auto">
                      {TRENDING_TAGS.slice(0, 8).map((tag) => (
                        <button
                          key={`sugg-${tag}`}
                          onClick={() => handleSelectTag(tag)}
                          className="px-3 py-1.5 bg-neutral-800 hover:bg-rose-600/20 text-neutral-300 hover:text-rose-300 hover:border-rose-500/40 rounded-xl text-xs font-semibold border border-neutral-700 transition-all cursor-pointer"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Results Grid - 2 columns on mobile, scaling up to 6 on desktop */}
              {results.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 pointer-events-auto">
                  {results.map((anime) => (
                    <a
                      key={anime.id || anime.slug}
                      href={`/anime/${anime.slug || anime.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleAnimeClick(anime);
                      }}
                      className="block group pointer-events-auto rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 transition-transform duration-200 active:scale-[0.97]"
                      aria-label={`View details for ${anime.titleEnglish || anime.title}`}
                    >
                      <AnimeCard
                        anime={anime}
                        onClick={() => handleAnimeClick(anime)}
                        onSelect={() => handleAnimeClick(anime)}
                        onWatchTrailer={() => {
                          if (query.trim().length >= 2) addSearchQuery(query.trim());
                          onClose();
                          if (onWatchTrailer) onWatchTrailer(anime);
                        }}
                        onWatchlistChanged={onWatchlistChanged}
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* STATE 2: INITIAL STATE (RECENT SEARCHES + TRENDING TAGS + TRENDING CATALOG) */
            <div className="space-y-8 animate-fadeIn">
              {/* SECTION: RECENT SEARCHES */}
              {searchHistory.length > 0 && (
                <section className="space-y-3 bg-neutral-900/60 p-4 sm:p-5 rounded-2xl border border-neutral-800/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-rose-500" />
                      <h3 className="text-xs sm:text-sm font-bold text-white">Recent Searches</h3>
                      <span className="px-1.5 py-0.5 bg-neutral-800 text-neutral-400 rounded-full text-[10px] font-mono">
                        {searchHistory.length}
                      </span>
                    </div>

                    <button
                      id="clear-all-recent-searches-btn"
                      onClick={handleClearAllHistory}
                      className="text-xs text-neutral-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear History</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {searchHistory.map((item, idx) => (
                      <div
                        key={`history-${item}-${idx}`}
                        id={`recent-search-chip-${idx}`}
                        onClick={() => handleSelectHistory(item)}
                        className="group flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-xl text-xs font-semibold border border-neutral-700/80 hover:border-rose-500/40 cursor-pointer transition-all shadow-sm"
                      >
                        <Clock className="w-3.5 h-3.5 text-neutral-400 group-hover:text-rose-400 shrink-0" />
                        <span>{item}</span>
                        <button
                          onClick={(e) => handleRemoveHistory(e, item)}
                          className="p-0.5 text-neutral-500 hover:text-rose-400 hover:bg-neutral-600 rounded transition-colors"
                          title="Remove from history"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* SECTION: TRENDING ANIME TAGS */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-rose-500" />
                  <h3 className="text-xs sm:text-sm font-bold text-white">Trending Searches</h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {TRENDING_TAGS.map((tag) => (
                    <button
                      key={`trending-tag-${tag}`}
                      onClick={() => handleSelectTag(tag)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-rose-950/40 text-neutral-300 hover:text-rose-300 rounded-xl text-xs font-semibold border border-neutral-800 hover:border-rose-500/40 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-rose-400" />
                      <span>{tag}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* SECTION: POPULAR & TRENDING ANIME PREVIEWS */}
              {trendingAnime.length > 0 && (
                <section className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-rose-500 fill-current" />
                      <h3 className="text-xs sm:text-sm font-bold text-white">Popular Right Now</h3>
                    </div>
                    <span className="text-xs text-neutral-400">Discover trending titles</span>
                  </div>

                  {/* 2-columns on mobile, responsive grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 pointer-events-auto">
                    {trendingAnime.slice(0, 12).map((anime) => (
                      <a
                        key={`trending-modal-${anime.id || anime.slug}`}
                        href={`/anime/${anime.slug || anime.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          handleAnimeClick(anime);
                        }}
                        className="block group pointer-events-auto rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 transition-transform duration-200 active:scale-[0.97]"
                        aria-label={`View details for ${anime.titleEnglish || anime.title}`}
                      >
                        <AnimeCard
                          anime={anime}
                          onClick={() => handleAnimeClick(anime)}
                          onSelect={() => handleAnimeClick(anime)}
                          onWatchTrailer={() => {
                            onClose();
                            if (onWatchTrailer) onWatchTrailer(anime);
                          }}
                          onWatchlistChanged={onWatchlistChanged}
                        />
                      </a>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
