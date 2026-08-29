import React, { useEffect, useState, memo } from 'react';
import { Star, Play, Bookmark, BookmarkCheck, CheckCircle2 } from 'lucide-react';
import { AnimeItem } from '../types/anime';
import { isInWatchlist, addToWatchlist, removeFromWatchlist, subscribeToWatchlistUpdates } from '../services/watchlistStore';
import { getAnimeProgress, subscribeToProgressUpdates, AnimeProgressSummary } from '../services/progressStore';
import { AnimePosterImage } from './AnimePosterImage';
import { prefetchAnimeData } from '../services/animeApi';

function cleanDisplayTitle(title?: string): string {
  if (!title) return '';
  return title
    .replace(/^SERIES\s+/i, '')
    .replace(/\s*[★⭐]\s*[\d.]+/gi, '')
    .replace(/\s*\(?(?:IMDb|TMDb|MAL)\s*:?\s*[\d.]+\)?/gi, '')
    .replace(/\s*★+/g, '')
    .trim();
}

interface AnimeCardProps {
  anime: AnimeItem;
  onClick?: (anime: AnimeItem) => void;
  onSelect?: (anime: AnimeItem) => void;
  onWatchTrailer?: (anime: AnimeItem) => void;
  onWatchlistChanged?: () => void;
  className?: string;
}

const AnimeCardComponent: React.FC<AnimeCardProps> = ({
  anime,
  onClick,
  onSelect,
  onWatchTrailer,
  onWatchlistChanged,
  className = '',
}) => {
  const [inWatchlist, setInWatchlist] = useState<boolean>(() => isInWatchlist(anime.id));
  const [progress, setProgress] = useState<AnimeProgressSummary>(() =>
    getAnimeProgress(anime.id, anime.episodes)
  );

  useEffect(() => {
    let isMounted = true;
    const updateProgressState = () => {
      if (!isMounted) return;
      setProgress(getAnimeProgress(anime.id, anime.episodes));
    };
    const updateWatchlistState = () => {
      if (!isMounted) return;
      setInWatchlist(isInWatchlist(anime.id));
    };

    updateProgressState();
    updateWatchlistState();

    const unsubProgress = subscribeToProgressUpdates(updateProgressState);
    const unsubWatchlist = subscribeToWatchlistUpdates(updateWatchlistState);

    return () => {
      isMounted = false;
      unsubProgress();
      unsubWatchlist();
    };
  }, [anime.id, anime.episodes]);

  const handleCardClick = (e: React.MouseEvent) => {
    if (onClick) onClick(anime);
    if (onSelect) onSelect(anime);
  };

  const handleToggleWatchlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inWatchlist) {
      removeFromWatchlist(anime.id);
      setInWatchlist(false);
    } else {
      addToWatchlist(anime, 'plan_to_watch');
      setInWatchlist(true);
    }
    if (onWatchlistChanged) {
      onWatchlistChanged();
    }
  };

  const posterImg =
    anime.images?.jpg?.imageUrl ||
    anime.images?.jpg?.largeImageUrl ||
    '';

  const displayTitle = cleanDisplayTitle(anime.titleEnglish || anime.title);

  return (
    <div
      id={`anime-card-${anime.id}`}
      onClick={handleCardClick}
      onMouseEnter={() => prefetchAnimeData(anime.slug || anime.id)}
      className={`group relative flex flex-col bg-neutral-900/90 hover:bg-neutral-850 border border-neutral-800/80 hover:border-rose-500/50 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-rose-950/20 hover:scale-[1.02] active:scale-[0.97] active:border-rose-500 w-full min-w-0 pointer-events-auto select-none ${className}`}
    >
      {/* Image Poster Area */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-950">
        <AnimePosterImage
          src={posterImg}
          alt={displayTitle}
          title={displayTitle}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity pointer-events-none" />

        {/* Top Badges: Star rating badge on top-left */}
        <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 right-1.5 sm:right-2 flex items-center justify-between z-10">
          {anime.score ? (
            <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 bg-black/80 backdrop-blur-md rounded-md border border-amber-500/30 text-amber-300 text-[9px] sm:text-xs font-bold shadow-sm">
              <Star className="w-2.5 sm:w-3 h-2.5 sm:h-3 fill-amber-400 text-amber-400" />
              <span>{anime.score.toFixed(1)}</span>
            </div>
          ) : (
            <div className="px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-[8px] sm:text-[10px] text-neutral-300 font-medium">
              {anime.type || 'Anime'}
            </div>
          )}

          {/* Quick Watchlist Toggle */}
          <button
            id={`bookmark-btn-${anime.id}`}
            title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
            aria-label={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
            onClick={handleToggleWatchlist}
            className={`p-1 sm:p-1.5 rounded-md backdrop-blur-md transition-all cursor-pointer ${
              inWatchlist
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-black/60 text-neutral-300 hover:text-white hover:bg-black/90'
            }`}
          >
            {inWatchlist ? (
              <BookmarkCheck className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-current" />
            ) : (
              <Bookmark className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            )}
          </button>
        </div>

        {/* Play Overlay Icon on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="w-9 sm:w-12 h-9 sm:h-12 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg shadow-rose-600/50 transform scale-75 group-hover:scale-100 transition-transform">
            <Play className="w-3.5 sm:w-5 h-3.5 sm:h-5 ml-0.5 fill-current" />
          </div>
        </div>

        {/* Episode / Type bottom badges */}
        <div className="absolute bottom-2 left-1.5 sm:left-2 right-1.5 sm:right-2 flex items-center justify-between text-[8px] sm:text-[10px] text-neutral-300 z-10">
          <span className="px-1 sm:px-1.5 py-0.5 bg-neutral-900/85 backdrop-blur-sm rounded border border-neutral-700/60 font-medium truncate max-w-[55%]">
            {anime.type || 'TV'} {anime.episodes ? `• ${anime.episodes}E` : ''}
          </span>
          {anime.status && (
            <span
              className={`px-1 sm:px-1.5 py-0.5 rounded font-medium truncate max-w-[45%] ${
                anime.status.includes('Currently') || anime.status === 'Airing'
                  ? 'bg-emerald-950/85 text-emerald-300 border border-emerald-500/30'
                  : 'bg-neutral-900/85 text-neutral-400'
              }`}
            >
              {anime.status.includes('Currently') ? 'Airing' : anime.status}
            </span>
          )}
        </div>

        {/* Progress Bar overlay on bottom edge of poster */}
        {progress.watchedCount > 0 && (
          <div className="absolute bottom-0 left-0 right-0 z-20">
            <div className="w-full bg-neutral-950/80 h-1.5 backdrop-blur-sm overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  progress.isCompleted
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                }`}
                style={{ width: `${Math.max(5, progress.percentage)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Content Area: Strictly clean title with ellipsis truncation */}
      <div className="p-1.5 sm:p-2.5 flex-1 flex flex-col justify-between min-w-0">
        <div className="min-w-0 w-full overflow-hidden">
          <h3
            title={displayTitle}
            className="font-semibold text-xs sm:text-sm text-neutral-100 group-hover:text-rose-400 transition-colors truncate block leading-snug w-full"
          >
            {displayTitle}
          </h3>
        </div>

        {/* Progress status & Genres */}
        <div className="space-y-1 mt-1 sm:mt-1.5">
          {progress.watchedCount > 0 && (
            <div className="flex items-center justify-between text-[9px] sm:text-[10px] bg-neutral-950/60 px-1.5 py-0.5 rounded border border-neutral-800">
              <span className="flex items-center gap-1 font-semibold text-rose-400 truncate">
                <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-500 shrink-0" />
                <span className="truncate">
                  {progress.isCompleted
                    ? 'Completed'
                    : `${progress.watchedCount}/${progress.totalEpisodes || '?'} ep`}
                </span>
              </span>
              <span className="text-[8px] sm:text-[9px] font-mono font-bold text-neutral-400 shrink-0 ml-1">
                {progress.percentage}%
              </span>
            </div>
          )}

          {/* Genres */}
          <div className="flex flex-wrap gap-1">
            {anime.genres.slice(0, 2).map((g) => (
              <span
                key={g.mal_id || g.name}
                className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 bg-neutral-800 text-neutral-400 rounded truncate max-w-full font-medium"
              >
                {g.name}
              </span>
            ))}
            {anime.year && (
              <span className="hidden sm:inline-block text-[9px] px-1 py-0.5 bg-neutral-800/60 text-neutral-500 rounded">
                {anime.year}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AnimeCard = memo(AnimeCardComponent, (prev, next) => {
  return (
    prev.anime.id === next.anime.id &&
    prev.anime.slug === next.anime.slug &&
    prev.anime.episodes === next.anime.episodes &&
    prev.anime.score === next.anime.score &&
    prev.anime.status === next.anime.status
  );
});


