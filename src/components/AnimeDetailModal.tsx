import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Star,
  Play,
  Bookmark,
  BookmarkCheck,
  Calendar,
  Clock,
  Tv,
  Film,
  Users,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Check,
  Lock,
  Crown,
} from 'lucide-react';
import {
  AnimeItem,
  AnimeEpisode,
  AnimeCharacter,
  AnimeReview,
  WatchlistEntry,
} from '../types/anime';
import { AnimePosterImage } from './AnimePosterImage';
import { getOptimizedTmdbImageUrl } from '../services/tmdbApi';
import {
  getAnimeDetails,
  getAnimeEpisodes,
  getAnimeCharacters,
  getAnimeReviews,
  getAnimeRecommendations,
  getCachedEpisodes,
} from '../services/animeApi';
import {
  getWatchlistEntry,
  addToWatchlist,
  updateWatchlistProgress,
  removeFromWatchlist,
  subscribeToWatchlistUpdates,
} from '../services/watchlistStore';
import {
  getWatchedEpisodes,
  getAnimeProgress,
  subscribeToProgressUpdates,
  AnimeProgressSummary,
  isEpisodeProgressWatched,
  toggleEpisodeProgressWatched,
} from '../services/progressStore';
import { isVipActive, subscribeToVip } from '../services/vipStore';
import { isEpisodeLocked } from '../services/adminStore';
import { SeasonSelector } from './SeasonSelector';
import { AdBanner } from './AdBanner';
import { VipUpgradeModal } from './VipUpgradeModal';

interface AnimeDetailModalProps {
  animeId: string | number | null;
  initialAnime?: AnimeItem | null;
  onClose: () => void;
  onWatchTrailer: (anime: AnimeItem, episode?: AnimeEpisode) => void;
  onSelectAnime: (anime: AnimeItem) => void;
  onWatchlistChanged?: () => void;
}

export const AnimeDetailModal: React.FC<AnimeDetailModalProps> = ({
  animeId,
  initialAnime,
  onClose,
  onWatchTrailer,
  onSelectAnime,
  onWatchlistChanged,
}) => {
  const [anime, setAnime] = useState<AnimeItem | null>(initialAnime || null);
  const [episodes, setEpisodes] = useState<AnimeEpisode[]>([]);
  const [characters, setCharacters] = useState<AnimeCharacter[]>([]);
  const [reviews, setReviews] = useState<AnimeReview[]>([]);
  const [recommendations, setRecommendations] = useState<AnimeItem[]>([]);
  const [activeTab, setActiveTab] = useState<'episodes' | 'characters' | 'reviews' | 'related'>('episodes');
  const [selectedSeason, setSelectedSeason] = useState<number | 'all'>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState<boolean>(true);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState<boolean>(true);
  const [isLoadingReviews, setIsLoadingReviews] = useState<boolean>(true);
  const [isLoadingRelated, setIsLoadingRelated] = useState<boolean>(true);
  const [showFullSynopsis, setShowFullSynopsis] = useState<boolean>(false);

  // Watchlist and progress state
  const [watchlistStatus, setWatchlistStatus] = useState<WatchlistEntry['status'] | null>(null);
  const [watchedEpisodes, setWatchedEpisodes] = useState<number[]>([]);
  const [progressSummary, setProgressSummary] = useState<AnimeProgressSummary | null>(null);
  const lastWatchClickRef = useRef<number>(0);

  // VIP Subscription state
  const [isVip, setIsVip] = useState<boolean>(isVipActive());
  const [vipModalOpen, setVipModalOpen] = useState<boolean>(false);

  useEffect(() => {
    return subscribeToVip((u) => setIsVip(u.isVip));
  }, []);

  // Available seasons list
  const availableSeasons = useMemo(() => {
    const fromEps = (
      Array.from(new Set(episodes.map((ep) => ep.season || 1))) as number[]
    ).sort((a: number, b: number) => a - b);
    if (fromEps.length > 0) return fromEps;
    const seasonCount = anime?.seasons || initialAnime?.seasons || 1;
    return Array.from({ length: seasonCount }, (_, i) => i + 1);
  }, [episodes, anime?.seasons, initialAnime?.seasons]);

  // Filtered episodes based on active season
  const filteredEpisodes = useMemo(() => {
    if (selectedSeason === 'all') return episodes;
    return episodes.filter((ep) => (ep.season || 1) === selectedSeason);
  }, [episodes, selectedSeason]);

  // Season episode counts
  const seasonEpisodeCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    availableSeasons.forEach((s) => {
      counts[s] = episodes.filter((ep) => (ep.season || 1) === s).length;
    });
    return counts;
  }, [episodes, availableSeasons]);

  // Season watched counts
  const seasonWatchedCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    if (!animeId) return counts;
    availableSeasons.forEach((s) => {
      const seasonEps = episodes.filter((ep) => (ep.season || 1) === s);
      counts[s] = seasonEps.filter((ep) =>
        isEpisodeProgressWatched(animeId, ep.season || 1, ep.number)
      ).length;
    });
    return counts;
  }, [episodes, availableSeasons, watchedEpisodes, animeId]);

  const currentSeasonEpisodesCount = filteredEpisodes.length;
  const currentSeasonWatchedCount = useMemo(() => {
    if (!animeId) return 0;
    return filteredEpisodes.filter((ep) =>
      isEpisodeProgressWatched(animeId, ep.season || 1, ep.number)
    ).length;
  }, [filteredEpisodes, watchedEpisodes, animeId]);

  const currentSeasonPercentage =
    currentSeasonEpisodesCount > 0
      ? Math.min(
          100,
          Math.round((currentSeasonWatchedCount / currentSeasonEpisodesCount) * 100)
        )
      : 0;

  const handleWatchTrailerClick = (targetAnime: AnimeItem, episode?: AnimeEpisode) => {
    const now = Date.now();
    if (now - lastWatchClickRef.current < 300) return;
    lastWatchClickRef.current = now;
    onWatchTrailer(targetAnime, episode);
  };

  const refreshProgress = () => {
    if (!animeId) return;
    const watched = getWatchedEpisodes(animeId);
    setWatchedEpisodes(watched);
    const count = anime?.episodes || episodes.length || 0;
    setProgressSummary(getAnimeProgress(animeId, count));

    const entry = getWatchlistEntry(animeId);
    if (entry) {
      setWatchlistStatus(entry.status);
    }
  };

  // State reset & Parallel data loading whenever animeId or initialAnime changes
  useEffect(() => {
    if (!animeId) return;

    let isMounted = true;
    
    // 1. Instantly reset layout states
    setSelectedSeason(1);
    setShowFullSynopsis(false);
    setActiveTab('episodes');
    setAnime(initialAnime || null);
    setCharacters([]);
    setReviews([]);
    setRecommendations([]);

    // 2. Load cached episodes for 0ms instant display, or compute instant interactive fallback structure
    const cachedEps = getCachedEpisodes(animeId);
    if (cachedEps && cachedEps.length > 0) {
      setEpisodes(cachedEps);
      setIsLoadingEpisodes(false);
    } else {
      // Create immediate interactive fallback structures (using episodes count if known)
      const targetAnime = initialAnime || anime;
      const totalEps = targetAnime?.episodes || 12;
      const totalSeasons = targetAnime?.seasons || 1;
      const epsPerSeason = Math.max(1, Math.round(totalEps / totalSeasons));
      const fallbackList: AnimeEpisode[] = [];
      for (let s = 1; s <= totalSeasons; s++) {
        const thisSeasonCount = s === totalSeasons ? totalEps - (totalSeasons - 1) * epsPerSeason : epsPerSeason;
        const count = Math.max(1, thisSeasonCount);
        for (let i = 1; i <= count; i++) {
          fallbackList.push({
            id: `fallback-s${s}-ep-${i}`,
            number: i,
            season: s,
            title: `Season ${s} • Episode ${i}`,
            aired: 'HD Available',
            score: 8.5,
          });
        }
      }
      setEpisodes(fallbackList);
      setIsLoadingEpisodes(true);
    }

    // Initialize all individual category loading states
    setIsLoading(true); // Base details loading state
    setIsLoadingCharacters(true);
    setIsLoadingReviews(true);
    setIsLoadingRelated(true);

    // 1. Fetch details in background (parallel)
    getAnimeDetails(animeId)
      .then((detail) => {
        if (!isMounted) return;
        if (detail) {
          setAnime(detail);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load anime details', err);
        if (isMounted) setIsLoading(false);
      });

    // 2. Fetch live episodes in background (parallel)
    getAnimeEpisodes(animeId)
      .then((eps) => {
        if (!isMounted) return;
        if (eps && eps.length > 0) {
          setEpisodes(eps);
        }
        setIsLoadingEpisodes(false);
      })
      .catch((err) => {
        console.error('Failed to load episodes', err);
        if (isMounted) setIsLoadingEpisodes(false);
      });

    // 3. Fetch characters in background (parallel)
    getAnimeCharacters(animeId)
      .then((chars) => {
        if (!isMounted) return;
        setCharacters(chars || []);
        setIsLoadingCharacters(false);
      })
      .catch((err) => {
        console.error('Failed to load characters', err);
        if (isMounted) setIsLoadingCharacters(false);
      });

    // 4. Fetch reviews in background (parallel)
    getAnimeReviews(animeId)
      .then((revs) => {
        if (!isMounted) return;
        setReviews(revs || []);
        setIsLoadingReviews(false);
      })
      .catch((err) => {
        console.error('Failed to load reviews', err);
        if (isMounted) setIsLoadingReviews(false);
      });

    // 5. Fetch recommendations in background (parallel)
    getAnimeRecommendations(animeId)
      .then((recs) => {
        if (!isMounted) return;
        setRecommendations(recs || []);
        setIsLoadingRelated(false);
      })
      .catch((err) => {
        console.error('Failed to load recommendations', err);
        if (isMounted) setIsLoadingRelated(false);
      });

    // Sync watchlist status
    const entry = getWatchlistEntry(animeId);
    if (entry) {
      setWatchlistStatus(entry.status);
    } else {
      setWatchlistStatus(null);
    }

    return () => {
      isMounted = false;
    };
  }, [animeId]);

  // 2. Fallback logic: If currently selected season does not exist for the newly opened anime, default to lowest/first available season
  useEffect(() => {
    if (selectedSeason === 'all') return;
    if (availableSeasons.length > 0 && !availableSeasons.includes(selectedSeason as number)) {
      setSelectedSeason(availableSeasons[0] || 1);
    }
  }, [availableSeasons, selectedSeason]);

  // 3. Dynamic Episode Tracker Sync: sync progress bar & watched status immediately
  useEffect(() => {
    if (!animeId) return;
    refreshProgress();
    const unsubProgress = subscribeToProgressUpdates(refreshProgress);
    const unsubWatchlist = subscribeToWatchlistUpdates(refreshProgress);
    return () => {
      unsubProgress();
      unsubWatchlist();
    };
  }, [animeId, anime?.id, anime?.episodes, episodes.length, selectedSeason]);


  if (!animeId) return null;

  const currentAnime = anime || initialAnime;
  if (!currentAnime && isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
        <div className="p-8 bg-neutral-900 rounded-2xl border border-neutral-800 flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-neutral-300">Loading Anime Details...</p>
        </div>
      </div>
    );
  }

  if (!currentAnime) return null;

  const poster =
    currentAnime.images?.jpg?.largeImageUrl ||
    currentAnime.images?.jpg?.imageUrl ||
    'https://via.placeholder.com/300x450';

  const handleUpdateStatus = (newStatus: WatchlistEntry['status']) => {
    setWatchlistStatus(newStatus);
    addToWatchlist(currentAnime, newStatus);
    if (onWatchlistChanged) onWatchlistChanged();
  };

  const handleRemoveWatchlist = () => {
    setWatchlistStatus(null);
    removeFromWatchlist(currentAnime.id);
    if (onWatchlistChanged) onWatchlistChanged();
  };

  const handleToggleEpisode = (ep: AnimeEpisode, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    toggleEpisodeProgressWatched(currentAnime, ep.season || 1, ep.number);
    if (onWatchlistChanged) onWatchlistChanged();
  };


  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-neutral-900 border-0 sm:border border-neutral-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden text-neutral-100 flex flex-col max-h-[96vh] sm:max-h-[92vh]">
        {/* Header / Close button */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
          <button
            id="close-anime-detail-modal-btn"
            onClick={onClose}
            className="p-2 sm:p-2.5 bg-black/70 hover:bg-black/90 text-white rounded-full backdrop-blur-md border border-neutral-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto flex-1 w-full">
          {/* Hero Banner Section inside modal */}
          <div className="relative h-56 sm:h-72 md:h-80 w-full overflow-hidden bg-neutral-950">
            <picture className="w-full h-full">
              {poster && poster.includes('image.tmdb.org') && (
                <source
                  srcSet={getOptimizedTmdbImageUrl(poster, 'w780')}
                  type="image/webp"
                />
              )}
              <img
                src={getOptimizedTmdbImageUrl(poster, 'w780')}
                alt={currentAnime.title}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (!img.dataset.retried) {
                    img.dataset.retried = '1';
                    setTimeout(() => {
                      img.src = `${getOptimizedTmdbImageUrl(poster, 'w780')}?_r=1`;
                    }, 1000);
                  }
                }}
                className="w-full h-full object-cover max-h-[260px] sm:max-h-[340px] filter blur-xs brightness-[0.35] scale-110"
              />
            </picture>
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/60 to-transparent" />

            {/* Poster & Main Header info */}
            <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-6 sm:right-6 md:left-8 md:right-8 flex items-end gap-3 sm:gap-5">
              {/* Poster Card */}
              <div className="w-20 sm:w-32 md:w-44 aspect-[3/4] max-h-[160px] sm:max-h-[260px] md:max-h-[300px] rounded-xl overflow-hidden border-2 border-neutral-700 shadow-2xl shrink-0 bg-neutral-900">
                <AnimePosterImage
                  src={poster}
                  alt={currentAnime.title}
                  title={currentAnime.title}
                  size="w500"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Title & Quick Info */}
              <div className="flex-1 space-y-1 sm:space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
                  {currentAnime.score && (
                    <span className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full font-bold">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {currentAnime.score.toFixed(1)} TMDb
                    </span>
                  )}
                  {currentAnime.imdbId && (
                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 rounded-full font-mono font-bold text-[10px] sm:text-xs">
                      IMDb {currentAnime.imdbId}
                    </span>
                  )}
                  {currentAnime.rank && (
                    <span className="hidden sm:inline-block px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full font-semibold">
                      Rank #{currentAnime.rank}
                    </span>
                  )}
                  <span className="px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded-full border border-neutral-700">
                    {currentAnime.type || 'TV'}
                  </span>
                  {currentAnime.status && (
                    <span className="px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded-full border border-neutral-700 truncate max-w-[100px] sm:max-w-none">
                      {currentAnime.status}
                    </span>
                  )}
                </div>

                <h1 className="text-base sm:text-2xl md:text-3xl font-extrabold text-white leading-tight truncate">
                  {currentAnime.titleEnglish || currentAnime.title}
                </h1>
                {currentAnime.titleJapanese && (
                  <p className="text-[11px] sm:text-xs md:text-sm text-neutral-400 truncate">
                    {currentAnime.titleJapanese}
                  </p>
                )}

                {/* Genre Tags */}
                <div className="flex flex-wrap gap-1 pt-0.5 sm:pt-1">
                  {currentAnime.genres.slice(0, 3).map((g) => (
                    <span
                      key={g.mal_id || g.name}
                      className="text-[10px] sm:text-xs px-2 py-0.5 bg-neutral-800/90 text-neutral-300 rounded-md border border-neutral-700"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar - Stacks neatly vertically on smaller screens */}
          <div className="px-3.5 sm:px-6 md:px-8 py-3 sm:py-4 bg-neutral-950 border-y border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
              <button
                id="modal-play-trailer-btn"
                onClick={() => handleWatchTrailerClick(currentAnime)}
                className="w-full sm:w-auto justify-center px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                Watch Trailer / Stream
              </button>

              {/* Watchlist dropdown */}
              <div className="relative w-full sm:w-auto">
                <select
                  id="modal-watchlist-select"
                  value={watchlistStatus || ''}
                  onChange={(e) => {
                    const val = e.target.value as WatchlistEntry['status'];
                    if (val) handleUpdateStatus(val);
                    else handleRemoveWatchlist();
                  }}
                  className="w-full sm:w-auto px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 hover:border-neutral-600 rounded-xl text-xs sm:text-sm font-semibold text-neutral-200 focus:outline-none cursor-pointer"
                >
                  <option value="">+ Add to Watchlist</option>
                  <option value="watching">🟢 Currently Watching</option>
                  <option value="plan_to_watch">🔵 Plan to Watch</option>
                  <option value="completed">🏆 Completed</option>
                  <option value="dropped">⚪ Dropped</option>
                </select>
              </div>
            </div>

            {/* Episode Tracker if in watchlist or has progress */}
            {(watchlistStatus || (progressSummary && progressSummary.watchedCount > 0)) && (
              <div className="flex items-center justify-between sm:justify-start gap-2.5 text-xs bg-neutral-900 px-3 py-2 rounded-xl border border-neutral-800 w-full sm:w-auto">
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-500" />
                  Progress:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-rose-400 font-bold font-mono">
                    {progressSummary?.watchedCount || 0} / {currentAnime.episodes || episodes.length || '?'} EPS
                  </span>
                  <div className="w-16 sm:w-24 bg-neutral-950 h-1.5 rounded-full overflow-hidden border border-neutral-800">
                    <div
                      className={`h-full transition-all duration-300 ${
                        progressSummary?.isCompleted ? 'bg-emerald-400' : 'bg-rose-500'
                      }`}
                      style={{ width: `${progressSummary?.percentage || 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400 font-bold">
                    {progressSummary?.percentage || 0}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Details & Synopsis */}
          <div className="p-3.5 sm:p-6 md:p-8 space-y-5 sm:space-y-6 w-full">
            {/* Metadata Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs bg-neutral-950/60 p-3 sm:p-4 rounded-xl border border-neutral-800/80 w-full">
              <div>
                <span className="text-neutral-500 block text-[11px]">Episodes & Format</span>
                <span className="font-semibold text-neutral-200 text-xs">
                  {currentAnime.type || 'TV'} ({currentAnime.episodes || '?'} eps × {currentAnime.duration || '24m'})
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px]">Season & Year</span>
                <span className="font-semibold text-neutral-200 text-xs capitalize">
                  {currentAnime.season || ''} {currentAnime.year || currentAnime.airedString || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px]">Studio & Producer</span>
                <span className="font-semibold text-neutral-200 text-xs">
                  {currentAnime.studios?.[0]?.name || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px]">Source Material</span>
                <span className="font-semibold text-neutral-200 text-xs">
                  {currentAnime.source || 'Original / Manga'}
                </span>
              </div>
            </div>

            {/* Ad Banner on Detail View (Bypassed if VIP) */}
            <AdBanner
              placement="detail"
              onOpenVipModal={() => setVipModalOpen(true)}
              className="my-1"
            />

            {/* Synopsis */}
            <div className="space-y-2">
              <h3 className="text-xs sm:text-sm font-bold text-neutral-200 uppercase tracking-wider">
                Synopsis
              </h3>
              <p
                className={`text-xs sm:text-sm text-neutral-300 leading-relaxed ${
                  !showFullSynopsis ? 'line-clamp-3 sm:line-clamp-4' : ''
                }`}
              >
                {currentAnime.synopsis}
              </p>
              {currentAnime.synopsis && currentAnime.synopsis.length > 200 && (
                <button
                  onClick={() => setShowFullSynopsis(!showFullSynopsis)}
                  className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                >
                  {showFullSynopsis ? (
                    <>
                      Show Less <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      Read Full Story <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-neutral-800 flex items-center gap-1 sm:gap-2 pt-2 overflow-x-auto pb-1 scrollbar-none whitespace-nowrap w-full">
              <button
                onClick={() => setActiveTab('episodes')}
                className={`pb-2.5 sm:pb-3 px-2.5 sm:px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeTab === 'episodes'
                    ? 'border-rose-500 text-rose-400'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Episodes ({episodes.length || currentAnime.episodes || 0})
              </button>

              <button
                onClick={() => setActiveTab('characters')}
                className={`pb-2.5 sm:pb-3 px-2.5 sm:px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeTab === 'characters'
                    ? 'border-rose-500 text-rose-400'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Characters ({characters.length})
              </button>

              <button
                onClick={() => setActiveTab('reviews')}
                className={`pb-2.5 sm:pb-3 px-2.5 sm:px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeTab === 'reviews'
                    ? 'border-rose-500 text-rose-400'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Reviews ({reviews.length})
              </button>

              <button
                onClick={() => setActiveTab('related')}
                className={`pb-2.5 sm:pb-3 px-2.5 sm:px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeTab === 'related'
                    ? 'border-rose-500 text-rose-400'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Recommended
              </button>
            </div>

            {/* Tab Contents */}
            <div className="min-h-[200px] w-full">
              {/* Episodes Tab */}
              {activeTab === 'episodes' && (
                <div className="space-y-3.5 w-full">
                  {/* Season Selector directly above Episode list/progress tracker */}
                  <div className="bg-neutral-950/70 p-3 rounded-2xl border border-neutral-800">
                    <SeasonSelector
                      availableSeasons={availableSeasons}
                      selectedSeason={selectedSeason}
                      onSelectSeason={(s) => setSelectedSeason(s)}
                      seasonEpisodeCounts={seasonEpisodeCounts}
                      totalEpisodesCount={episodes.length || currentAnime.episodes || 12}
                      seasonWatchedCounts={seasonWatchedCounts}
                      totalWatchedCount={watchedEpisodes.length}
                      showAllOption={availableSeasons.length > 1}
                    />
                  </div>

                  {/* Quick Progress Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-rose-500" />
                        {selectedSeason === 'all'
                          ? 'Total Anime Progress:'
                          : `Season ${selectedSeason} Progress:`}
                      </span>
                      <span className="text-xs font-mono font-bold text-rose-400">
                        {currentSeasonWatchedCount} / {currentSeasonEpisodesCount} Watched
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-28 sm:w-40 bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            currentSeasonPercentage === 100 ? 'bg-emerald-400' : 'bg-rose-500'
                          }`}
                          style={{ width: `${currentSeasonPercentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400 font-bold">
                        {currentSeasonPercentage}%
                      </span>
                    </div>
                  </div>

                  {filteredEpisodes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5 w-full max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
                      {filteredEpisodes.map((ep) => {
                        const isWatched = isEpisodeProgressWatched(
                          animeId,
                          ep.season || 1,
                          ep.number
                        );
                        const epLock = isEpisodeLocked(currentAnime.slug || currentAnime.id, ep.number);

                        return (
                          <div
                            key={ep.id || `${ep.season || 1}_${ep.number}`}
                            onClick={() => handleWatchTrailerClick(currentAnime, ep)}
                            className={`p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between group min-w-0 ${
                              epLock.locked && !isVip
                                ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/60'
                                : isWatched
                                ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/60'
                                : 'bg-neutral-950/70 hover:bg-neutral-800 border-neutral-800 hover:border-rose-500/50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 truncate">
                              <span
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                                  epLock.locked && !isVip
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                    : isWatched
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-600/10 text-rose-400 border border-rose-500/20 group-hover:bg-rose-600 group-hover:text-white'
                                }`}
                              >
                                {epLock.locked && !isVip ? (
                                  <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
                                ) : (
                                  ep.number
                                )}
                              </span>
                              <div className="truncate min-w-0">
                                <h4
                                  className={`text-xs font-semibold truncate flex items-center gap-1.5 ${
                                    epLock.locked && !isVip
                                      ? 'text-amber-200'
                                      : isWatched
                                      ? 'text-emerald-200'
                                      : 'text-neutral-200 group-hover:text-white'
                                  }`}
                                >
                                  <span>
                                    {ep.season && ep.season > 1
                                      ? `S${ep.season} • Episode ${ep.number}`
                                      : ep.title || `Episode ${ep.number}`}
                                  </span>
                                  {epLock.locked && !isVip && (
                                    <span className="px-1 py-0.2 bg-amber-500/20 text-amber-400 text-[9px] font-bold rounded">
                                      VIP
                                    </span>
                                  )}
                                </h4>
                                <span className="text-[10px] text-neutral-500">
                                  {ep.aired || 'HD Available'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              <button
                                onClick={(e) => handleToggleEpisode(ep, e)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                                  isWatched
                                    ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-rose-600/20 hover:text-rose-300 hover:border-rose-500/40'
                                    : 'bg-neutral-800 hover:bg-emerald-600/20 text-neutral-400 hover:text-emerald-300 border-neutral-700 hover:border-emerald-500/40'
                                }`}
                                title={isWatched ? 'Mark unwatched' : 'Mark watched'}
                              >
                                <CheckCircle2
                                  className={`w-3 h-3 ${
                                    isWatched ? 'text-emerald-400' : 'text-neutral-500'
                                  }`}
                                />
                                <span>{isWatched ? 'Watched' : 'Mark'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : isLoadingEpisodes ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5 w-full max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
                      {Array.from({ length: 9 }).map((_, idx) => (
                        <div
                          key={`ep-skeleton-${idx}`}
                          className="p-3 sm:p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/40 animate-pulse flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-neutral-850 shrink-0" />
                            <div className="space-y-1.5 min-w-0">
                              <div className="h-3 w-28 bg-neutral-800 rounded" />
                              <div className="h-2 w-16 bg-neutral-900 rounded" />
                            </div>
                          </div>
                          <div className="w-14 h-6 bg-neutral-800 rounded-lg shrink-0" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-neutral-500 bg-neutral-950/40 rounded-xl border border-neutral-800">
                      <p className="text-xs">No episodes listed for this season.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Characters Tab */}
              {activeTab === 'characters' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 w-full">
                  {characters.length > 0 ? (
                    characters.map((c) => (
                      <div
                        key={c.id}
                        className="p-2.5 bg-neutral-950/60 border border-neutral-800 rounded-xl flex items-center gap-3 min-w-0"
                      >
                        <picture className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 overflow-hidden rounded-lg">
                          {c.imageUrl && c.imageUrl.includes('image.tmdb.org') && (
                            <source
                              srcSet={getOptimizedTmdbImageUrl(c.imageUrl, 'w185')}
                              type="image/webp"
                            />
                          )}
                          <img
                            src={getOptimizedTmdbImageUrl(c.imageUrl, 'w185')}
                            alt={c.name}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              if (!img.dataset.retried) {
                                img.dataset.retried = '1';
                                setTimeout(() => {
                                  img.src = `${getOptimizedTmdbImageUrl(c.imageUrl, 'w185')}?_r=1`;
                                }, 1000);
                              }
                            }}
                            className="w-full h-full object-cover bg-neutral-900"
                          />
                        </picture>
                        <div className="truncate min-w-0">
                          <h4 className="text-xs font-bold text-neutral-200 truncate">{c.name}</h4>
                          <p className="text-[10px] text-neutral-400">{c.role}</p>
                          {c.voiceActor && (
                            <p className="text-[10px] text-rose-400 truncate">
                              VA: {c.voiceActor.name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : isLoadingCharacters ? (
                    Array.from({ length: 8 }).map((_, idx) => (
                      <div
                        key={`char-skeleton-${idx}`}
                        className="p-2.5 bg-neutral-950/60 border border-neutral-800 rounded-xl flex items-center gap-3 animate-pulse"
                      >
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-neutral-850 shrink-0" />
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="h-3 w-20 bg-neutral-800 rounded" />
                          <div className="h-2 w-12 bg-neutral-900 rounded" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-8 text-center text-neutral-500 bg-neutral-950/40 rounded-xl border border-neutral-800">
                      <p className="text-xs">No characters listed for this anime.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Reviews Tab */}
              {activeTab === 'reviews' && (
                <div className="space-y-3 w-full">
                  {reviews.length > 0 ? (
                    reviews.map((r) => (
                      <div
                        key={r.id}
                        className="p-3 sm:p-4 bg-neutral-950/60 border border-neutral-800 rounded-xl space-y-2 w-full"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-rose-600/30 text-rose-300 flex items-center justify-center font-bold text-xs">
                              {r.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-neutral-200">
                                {r.username}
                              </span>
                              <span className="text-[10px] text-neutral-500 ml-2">{r.date}</span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold rounded">
                            ★ {r.score}/10
                          </span>
                        </div>
                        <p className="text-xs text-neutral-300 leading-relaxed">{r.review}</p>
                      </div>
                    ))
                  ) : isLoadingReviews ? (
                    Array.from({ length: 3 }).map((_, idx) => (
                      <div
                        key={`review-skeleton-${idx}`}
                        className="p-3 sm:p-4 bg-neutral-950/60 border border-neutral-800 rounded-xl space-y-3 animate-pulse"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-neutral-850" />
                            <div className="space-y-1">
                              <div className="h-3 w-20 bg-neutral-800 rounded" />
                              <div className="h-2 w-12 bg-neutral-900 rounded" />
                            </div>
                          </div>
                          <div className="w-12 h-5 bg-neutral-800 rounded animate-pulse" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="h-3 w-full bg-neutral-800 rounded" />
                          <div className="h-3 w-5/6 bg-neutral-800 rounded" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-neutral-500 bg-neutral-950/40 rounded-xl border border-neutral-800">
                      <p className="text-xs">No reviews available yet.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Related / Recommendations Tab */}
              {activeTab === 'related' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 sm:gap-3 w-full">
                  {recommendations.length > 0 ? (
                    recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        onClick={() => onSelectAnime(rec)}
                        className="group cursor-pointer p-2 bg-neutral-950/60 hover:bg-neutral-800 border border-neutral-800 hover:border-rose-500/40 rounded-xl transition-all min-w-0"
                      >
                        <div className="aspect-[3/4] max-h-[220px] rounded-lg overflow-hidden mb-2 bg-neutral-900">
                          <AnimePosterImage
                            src={rec.images?.jpg?.imageUrl}
                            alt={rec.title}
                            title={rec.title}
                            size="w342"
                            className="w-full h-full object-cover max-h-[220px] group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <h4 className="text-xs font-semibold text-neutral-200 truncate group-hover:text-rose-400">
                          {rec.title}
                        </h4>
                      </div>
                    ))
                  ) : isLoadingRelated ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <div
                        key={`rec-skeleton-${idx}`}
                        className="p-2 bg-neutral-950/60 border border-neutral-800 rounded-xl animate-pulse space-y-2"
                      >
                        <div className="aspect-[3/4] w-full rounded-lg bg-neutral-850" />
                        <div className="h-3 w-5/6 bg-neutral-800 rounded mx-auto" />
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-8 text-center text-neutral-500 bg-neutral-950/40 rounded-xl border border-neutral-800">
                      <p className="text-xs">No related recommendations found.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* VIP Upgrade Modal */}
      <VipUpgradeModal
        isOpen={vipModalOpen}
        onClose={() => setVipModalOpen(false)}
        initialPlanId="plan_pro"
        sourceContext="detail_banner"
      />
    </div>
  );
};
