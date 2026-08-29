import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  Star,
  Play,
  Trash2,
  CheckCircle,
  Clock,
  Flame,
  Search,
  Download,
  Upload,
  Plus,
  Minus,
} from 'lucide-react';
import { WatchlistEntry, AnimeItem } from '../types/anime';
import {
  getWatchlist,
  updateWatchlistProgress,
  removeFromWatchlist,
  saveWatchlist,
  subscribeToWatchlistUpdates,
} from '../services/watchlistStore';
import { subscribeToProgressUpdates } from '../services/progressStore';
import { AnimePosterImage } from './AnimePosterImage';

interface WatchlistViewProps {
  onSelectAnime: (anime: AnimeItem) => void;
  onWatchTrailer: (anime: AnimeItem) => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  onSelectAnime,
  onWatchTrailer,
}) => {
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>(() => getWatchlist());
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const refreshList = () => {
    setWatchlist(getWatchlist());
  };

  useEffect(() => {
    refreshList();
    const unsubProgress = subscribeToProgressUpdates(refreshList);
    const unsubWatchlist = subscribeToWatchlistUpdates(refreshList);
    return () => {
      unsubProgress();
      unsubWatchlist();
    };
  }, []);

  const handleStatusChange = (
    animeId: string | number,
    newStatus: WatchlistEntry['status']
  ) => {
    const entry = watchlist.find((w) => String(w.anime.id) === String(animeId));
    if (entry) {
      updateWatchlistProgress(animeId, entry.watchedEpisodes, newStatus);
      refreshList();
    }
  };

  const handleStepEp = (animeId: string | number, delta: number) => {
    const entry = watchlist.find((w) => String(w.anime.id) === String(animeId));
    if (entry) {
      const max = entry.anime.episodes || 999;
      const nextVal = Math.max(0, Math.min(max, entry.watchedEpisodes + delta));
      const newStatus = nextVal >= max && max > 0 ? 'completed' : entry.status;
      updateWatchlistProgress(animeId, nextVal, newStatus);
      refreshList();
    }
  };

  const handleRemove = (animeId: string | number) => {
    removeFromWatchlist(animeId);
    refreshList();
  };

  const handleExport = () => {
    const jsonStr = JSON.stringify(watchlist, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `animestream-watchlist-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (Array.isArray(parsed)) {
          saveWatchlist(parsed);
          setWatchlist(parsed);
        }
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const filteredItems = watchlist.filter((item) => {
    if (filter !== 'all' && item.status !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.anime.title.toLowerCase().includes(q) ||
        (item.anime.titleEnglish && item.anime.titleEnglish.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-2.5 xs:px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-3 sm:space-y-4 animate-fadeIn w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3 sm:pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2 sm:gap-2.5">
            <Bookmark className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500 fill-rose-500/20" />
            My Anime Watchlist
          </h1>
          <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5">
            Keep track of currently watching series, plan-to-watch queue, and completed favorites.
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          <label className="flex-1 sm:flex-none justify-center cursor-pointer px-2.5 sm:px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700 flex items-center gap-1.5 transition-colors">
            <Upload className="w-3.5 h-3.5" />
            Import
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          <button
            id="export-watchlist-btn"
            onClick={handleExport}
            disabled={watchlist.length === 0}
            className="flex-1 sm:flex-none justify-center px-2.5 sm:px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4 w-full">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-1 scrollbar-none max-w-full">
          {[
            { key: 'all', label: `All (${watchlist.length})` },
            {
              key: 'watching',
              label: `Watching (${watchlist.filter((w) => w.status === 'watching').length})`,
            },
            {
              key: 'plan_to_watch',
              label: `Plan (${watchlist.filter((w) => w.status === 'plan_to_watch').length})`,
            },
            {
              key: 'completed',
              label: `Done (${watchlist.filter((w) => w.status === 'completed').length})`,
            },
            {
              key: 'dropped',
              label: `Dropped (${watchlist.filter((w) => w.status === 'dropped').length})`,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`shrink-0 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === tab.key
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-750'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search inside Watchlist */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            id="search-watchlist-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter list..."
            className="w-full pl-8 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* Watchlist Grid */}
      {filteredItems.length === 0 ? (
        <div className="py-12 sm:py-16 text-center bg-neutral-900/40 border border-dashed border-neutral-800 rounded-2xl p-4 sm:p-8">
          <Bookmark className="w-8 h-8 sm:w-10 sm:h-10 text-neutral-600 mx-auto mb-2" />
          <h3 className="text-xs sm:text-sm font-bold text-white mb-1">No Anime Found in this Category</h3>
          <p className="text-[11px] sm:text-xs text-neutral-400 max-w-sm mx-auto">
            Browse anime from Home or Search and click the bookmark icon to start building your
            watchlist!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5 w-full">
          {filteredItems.map((item) => {
            const anime = item.anime;
            const poster =
              anime.images?.jpg?.imageUrl || 'https://via.placeholder.com/150?text=Poster';
            const totalEps = anime.episodes || 0;

            return (
              <div
                key={anime.id}
                className="p-2 sm:p-3 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl flex gap-2.5 sm:gap-3 transition-all shadow-md group min-w-0"
              >
                {/* Poster Thumbnail */}
                <div
                  onClick={() => onSelectAnime(anime)}
                  className="w-16 xs:w-20 sm:w-24 aspect-[3/4] max-h-[130px] rounded-lg overflow-hidden bg-neutral-950 shrink-0 cursor-pointer relative"
                >
                  <AnimePosterImage
                    src={poster}
                    alt={anime.title}
                    title={anime.title}
                    className="w-full h-full object-cover max-h-[130px]"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                </div>

                {/* Details & Controls */}
                <div className="flex-1 flex flex-col justify-between overflow-hidden min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h3
                        onClick={() => onSelectAnime(anime)}
                        className="font-bold text-xs sm:text-sm text-white hover:text-rose-400 cursor-pointer truncate"
                      >
                        {anime.titleEnglish || anime.title}
                      </h3>
                      <button
                        onClick={() => handleRemove(anime.id)}
                        className="text-neutral-500 hover:text-rose-400 p-0.5 sm:p-1 transition-colors shrink-0 cursor-pointer"
                        title="Remove from list"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[9px] sm:text-[10px] text-neutral-500 truncate mt-0.5">
                      {anime.genres.map((g) => g.name).slice(0, 2).join(', ')} • {anime.type || 'TV'}
                    </p>
                  </div>

                  {/* Episode stepper and Status */}
                  <div className="space-y-1 sm:space-y-1.5 pt-1 sm:pt-1.5">
                    {/* Stepper */}
                    <div className="flex items-center justify-between bg-neutral-950 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md border border-neutral-800">
                      <span className="text-[10px] sm:text-xs text-neutral-400 font-medium">Ep:</span>
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <button
                          onClick={() => handleStepEp(anime.id, -1)}
                          disabled={item.watchedEpisodes <= 0}
                          className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 text-white flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </button>
                        <span className="text-[10px] sm:text-xs font-bold text-rose-400 font-mono">
                          {item.watchedEpisodes} / {totalEps > 0 ? totalEps : '?'}
                        </span>
                        <button
                          onClick={() => handleStepEp(anime.id, 1)}
                          disabled={totalEps > 0 && item.watchedEpisodes >= totalEps}
                          className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 text-white flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Status selector */}
                    <select
                      value={item.status}
                      onChange={(e) =>
                        handleStatusChange(anime.id, e.target.value as WatchlistEntry['status'])
                      }
                      className="w-full px-1.5 py-0.5 bg-neutral-950 border border-neutral-800 rounded-md text-[10px] sm:text-xs font-semibold text-neutral-300 focus:outline-none focus:border-rose-500 cursor-pointer"
                    >
                      <option value="watching">🟢 Watching</option>
                      <option value="plan_to_watch">🔵 Plan to Watch</option>
                      <option value="completed">🏆 Completed</option>
                      <option value="dropped">⚪ Dropped</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
