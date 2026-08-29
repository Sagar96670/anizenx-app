import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Info,
  Bookmark,
  BookmarkCheck,
  Star,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { AnimeItem } from '../types/anime';
import { isInWatchlist, addToWatchlist, removeFromWatchlist, subscribeToWatchlistUpdates } from '../services/watchlistStore';
import { generateGradientPlaceholder, getOptimizedTmdbImageUrl } from '../services/tmdbApi';

interface HeroBannerProps {
  spotlights: AnimeItem[];
  onSelectAnime: (anime: AnimeItem) => void;
  onWatchTrailer: (anime: AnimeItem) => void;
  onWatchlistChanged?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  spotlights,
  onSelectAnime,
  onWatchTrailer,
  onWatchlistChanged,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [inWatchlist, setInWatchlist] = useState<boolean>(false);

  const activeAnime = spotlights[currentIndex] || spotlights[0];
  const activeAnimeId = activeAnime?.id;

  useEffect(() => {
    if (!activeAnimeId) return;
    const update = () => {
      setInWatchlist(isInWatchlist(activeAnimeId));
    };
    update();
    return subscribeToWatchlistUpdates(update);
  }, [activeAnimeId]);

  // Auto-rotate hero spotlights every 8 seconds, pausing if page is in background
  useEffect(() => {
    if (spotlights.length <= 1) return;
    let timer: NodeJS.Timeout | null = null;

    const startTimer = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        setCurrentIndex((prev) => (prev + 1) % spotlights.length);
      }, 8000);
    };

    startTimer();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (timer) clearInterval(timer);
      } else {
        startTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [spotlights.length]);

  if (!activeAnime) return null;


  const lastWatchClickRef = useRef<number>(0);

  const handleWatchTrailerClick = () => {
    const now = Date.now();
    if (now - lastWatchClickRef.current < 300) return;
    lastWatchClickRef.current = now;
    onWatchTrailer(activeAnime);
  };

  const handleToggleWatchlist = () => {
    if (inWatchlist) {
      removeFromWatchlist(activeAnime.id);
      setInWatchlist(false);
    } else {
      addToWatchlist(activeAnime, 'watching');
      setInWatchlist(true);
    }
    if (onWatchlistChanged) {
      onWatchlistChanged();
    }
  };

  const backdrop =
    activeAnime.backdropImage ||
    activeAnime.bannerImage ||
    activeAnime.images?.jpg?.largeImageUrl ||
    activeAnime.images?.jpg?.imageUrl ||
    generateGradientPlaceholder(activeAnime.title);

  const optimizedBackdrop = getOptimizedTmdbImageUrl(backdrop, 'w1280');

  return (
    <div className="relative w-full min-h-[340px] xs:min-h-[370px] sm:min-h-[440px] md:min-h-[500px] lg:h-[540px] overflow-hidden bg-neutral-950 text-white select-none">
      {/* Background Backdrop Image */}
      <div className="absolute inset-0 z-0">
        <picture className="w-full h-full">
          {optimizedBackdrop && optimizedBackdrop.includes('image.tmdb.org') && (
            <source
              srcSet={optimizedBackdrop}
              type="image/webp"
            />
          )}
          <img
            key={activeAnime.id}
            src={optimizedBackdrop}
            alt={activeAnime.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (!img.dataset.retried) {
                img.dataset.retried = '1';
                setTimeout(() => {
                  img.src = `${optimizedBackdrop}?_r=1`;
                }, 1000);
              } else {
                img.src = generateGradientPlaceholder(activeAnime.title);
              }
            }}
            className="w-full h-full object-cover object-center filter brightness-[0.38] sm:brightness-[0.45] saturate-125 transition-all duration-1000 scale-105"
          />
        </picture>
        {/* Multi-directional vignette gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-transparent" />
        <div className="absolute inset-0 bg-radial-vignette opacity-70" />
      </div>

      {/* Hero Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto h-full px-3 sm:px-5 lg:px-8 flex flex-col justify-between pt-12 sm:pt-16 pb-3 sm:pb-5">
        {/* Spotlight Info */}
        <div className="max-w-2xl space-y-1.5 sm:space-y-2.5 my-auto">
          {/* Top Pill / Badge */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-600/90 text-white rounded-full shadow-md shadow-rose-600/40 text-[9px] sm:text-xs">
              <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
              <span>#{currentIndex + 1} Spotlight</span>
            </span>

            {activeAnime.score && (
              <span className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full backdrop-blur-sm text-[9px] sm:text-xs font-bold">
                <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-400 text-amber-400" />
                <span>{activeAnime.score.toFixed(1)} TMDb</span>
              </span>
            )}

            {activeAnime.imdbId && (
              <span className="hidden xs:inline-flex px-1.5 sm:px-2 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 rounded-full font-mono text-[9px] sm:text-xs font-bold">
                IMDb {activeAnime.imdbId}
              </span>
            )}

            {activeAnime.type && (
              <span className="px-1.5 sm:px-2 py-0.5 bg-neutral-800/80 text-neutral-300 rounded-full border border-neutral-700 text-[9px] sm:text-xs">
                {activeAnime.type} {activeAnime.episodes ? `• ${activeAnime.episodes} EPS` : ''}
              </span>
            )}

            {activeAnime.studios?.[0]?.name && (
              <span className="hidden sm:inline-flex px-2 py-0.5 bg-neutral-800/80 text-neutral-300 rounded-full border border-neutral-700 text-[10px] sm:text-xs">
                {activeAnime.studios[0].name}
              </span>
            )}
          </div>

          {/* Title */}
          <div>
            <h1 className="text-lg xs:text-xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight drop-shadow-md line-clamp-2">
              {activeAnime.titleEnglish || activeAnime.title}
            </h1>
            {activeAnime.titleJapanese && (
              <p className="text-[10px] sm:text-xs md:text-sm text-rose-300/80 font-medium tracking-wide mt-0.5 truncate">
                {activeAnime.titleJapanese}
              </p>
            )}
          </div>

          {/* Genres */}
          <div className="flex flex-wrap gap-1">
            {activeAnime.genres.slice(0, 3).map((g) => (
              <span
                key={g.mal_id || g.name}
                className="text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-neutral-900/80 text-neutral-300 rounded border border-neutral-800"
              >
                {g.name}
              </span>
            ))}
          </div>

          {/* Synopsis */}
          <p className="text-[10px] sm:text-xs md:text-sm text-neutral-300/90 line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-xl">
            {activeAnime.synopsis}
          </p>

          {/* Call to Actions - Compact inline row on all devices */}
          <div className="pt-1 sm:pt-2 flex flex-row items-center gap-1.5 sm:gap-2.5 w-full max-w-lg">
            <button
              id="hero-watch-trailer-btn"
              onClick={handleWatchTrailerClick}
              className="flex-1 sm:flex-none justify-center px-3 sm:px-4 py-2 sm:py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-rose-600/30 hover:shadow-rose-600/50 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Watch Trailer</span>
            </button>

            <button
              id="hero-details-btn"
              onClick={() => onSelectAnime(activeAnime)}
              className="flex-1 sm:flex-none justify-center px-3 sm:px-4 py-2 sm:py-2.5 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 hover:text-white text-xs sm:text-sm font-semibold rounded-xl border border-neutral-700/80 backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Details</span>
            </button>

            <button
              id="hero-watchlist-toggle-btn"
              onClick={handleToggleWatchlist}
              className={`p-2 sm:px-3 sm:py-2.5 rounded-xl border backdrop-blur-md transition-all flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold cursor-pointer shrink-0 ${
                inWatchlist
                  ? 'bg-rose-950/60 border-rose-500/60 text-rose-400'
                  : 'bg-neutral-900/80 border-neutral-700/80 text-neutral-300 hover:text-white hover:bg-neutral-800'
              }`}
              title={inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
              aria-label="Toggle Watchlist"
            >
              {inWatchlist ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current text-rose-400" />
                  <span className="hidden sm:inline">Saved</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Watchlist</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Carousel Bottom Thumbnail Selector */}
        {spotlights.length > 1 && (
          <div className="flex items-center justify-between gap-2 pt-2 sm:pt-3 border-t border-neutral-800/50 mt-2 sm:mt-3">
            {/* Arrows & Counter */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                id="prev-spotlight-btn"
                onClick={() =>
                  setCurrentIndex((prev) => (prev === 0 ? spotlights.length - 1 : prev - 1))
                }
                className="p-1 sm:p-1.5 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                title="Previous Spotlight"
                aria-label="Previous spotlight"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                id="next-spotlight-btn"
                onClick={() => setCurrentIndex((prev) => (prev + 1) % spotlights.length)}
                className="p-1 sm:p-1.5 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                title="Next Spotlight"
                aria-label="Next spotlight"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 py-0.5 bg-neutral-900/80 border border-neutral-800 rounded text-[10px] font-mono text-neutral-300 font-bold shrink-0">
                {currentIndex + 1}/{spotlights.length}
              </span>
            </div>

            {/* Thumbnail dots with touch-friendly scroll */}
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
              {spotlights.map((anime, idx) => (
                <button
                  key={anime.id}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Select spotlight ${idx + 1}: ${anime.title}`}
                  className={`group relative transition-all duration-200 rounded-md overflow-hidden border shrink-0 cursor-pointer ${
                    currentIndex === idx
                      ? 'w-9 sm:w-12 h-6 sm:h-8 border-rose-500 ring-1 ring-rose-500/50 scale-105'
                      : 'w-6 sm:w-8 h-6 sm:h-8 border-neutral-800 opacity-50 hover:opacity-100 hover:border-neutral-600'
                  }`}
                >
                  <picture className="w-full h-full">
                    {anime.images?.jpg?.imageUrl && anime.images.jpg.imageUrl.includes('image.tmdb.org') && (
                      <source
                        srcSet={getOptimizedTmdbImageUrl(anime.images.jpg.imageUrl, 'w185')}
                        type="image/webp"
                      />
                    )}
                    <img
                      src={getOptimizedTmdbImageUrl(anime.images?.jpg?.imageUrl, 'w185')}
                      alt={anime.title}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = generateGradientPlaceholder(anime.title);
                      }}
                      className="w-full h-full object-cover"
                    />
                  </picture>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
