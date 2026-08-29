import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  Tv,
  ExternalLink,
  Server,
  Layers,
  Sparkles,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Check,
  List,
  Grid,
  CheckCheck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
  Lock,
  Crown,
} from 'lucide-react';
import { AnimeItem, AnimeEpisode, StreamServer } from '../types/anime';
import {
  getAnimeStreams,
  getCachedStreams,
  getAnimeEpisodes,
  recordWatch,
  prefetchAdjacentEpisodes,
  preconnectDomain,
} from '../services/animeApi';
import {
  getWatchedEpisodes,
  getAnimeProgress,
  subscribeToProgressUpdates,
  AnimeProgressSummary,
  isEpisodeProgressWatched,
  setEpisodeProgressWatched,
  toggleEpisodeProgressWatched,
  markSeasonEpisodesWatched,
} from '../services/progressStore';
import { isVipActive, subscribeToVip } from '../services/vipStore';
import {
  isEpisodeLocked,
  getAdEngineSettings,
  shouldDisplayAd,
  subscribeToAdminState,
} from '../services/adminStore';
import { SeasonSelector } from './SeasonSelector';
import { PrerollAdOverlay } from './PrerollAdOverlay';
import { MidrollAdOverlay } from './MidrollAdOverlay';
import {
  RewardedAdGate,
  isRewardedAdActive,
  isRewardedAdCooldownActive,
  setRewardedAdUnlocked,
} from './RewardedAdGate';
import { AdBanner } from './AdBanner';
import { VipUpgradeModal } from './VipUpgradeModal';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  anime: AnimeItem | null;
  selectedEpisode?: AnimeEpisode | null;
  onSelectEpisode?: (ep: AnimeEpisode) => void;
  episodes?: AnimeEpisode[];
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  isOpen,
  onClose,
  anime,
  selectedEpisode,
  onSelectEpisode,
  episodes = [],
}) => {
  const animeSlugOrId = anime ? (anime.slug || String(anime.id)) : '';
  const initialCachedStreams = anime ? getCachedStreams(animeSlugOrId) : null;

  const [streamServers, setStreamServers] = useState<StreamServer[]>(
    () => initialCachedStreams?.servers || []
  );
  const [selectedServerIndex, setSelectedServerIndex] = useState<number>(0);
  const [isLoadingStreams, setIsLoadingStreams] = useState<boolean>(
    () => !initialCachedStreams || initialCachedStreams.servers.length === 0
  );
  const [isEpisodeSwitching, setIsEpisodeSwitching] = useState<boolean>(false);
  const [loadingEpNumber, setLoadingEpNumber] = useState<number>(selectedEpisode?.number || 1);
  const [subDub, setSubDub] = useState<'sub' | 'dub'>('sub');
  const [quality, setQuality] = useState<'1080p' | '720p' | '480p'>('1080p');
  const [loadedEpisodes, setLoadedEpisodes] = useState<AnimeEpisode[]>(episodes);
  const [viewMode, setViewMode] = useState<'rows' | 'compact'>('rows');
  const [selectedSeason, setSelectedSeason] = useState<number | 'all'>(
    selectedEpisode?.season || 1
  );

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastFetchedSlugRef = useRef<string>(initialCachedStreams ? animeSlugOrId : '');
  const pendingSeekTimeRef = useRef<number | null>(null);

  // Episode progress tracking state
  const [watchedEpisodes, setWatchedEpisodes] = useState<number[]>([]);
  const [progressSummary, setProgressSummary] = useState<AnimeProgressSummary | null>(null);

  // VIP & Dynamic Ad Engine states
  const [isVip, setIsVip] = useState<boolean>(isVipActive());
  const [adConfig, setAdConfig] = useState(getAdEngineSettings());

  // Check if rewarded ad gate is bypassed by VIP, turned off in Admin Panel, or within cooldown duration
  const isRewardedAdUnlocked = useCallback(() => {
    if (isVip || isVipActive()) return true;
    if (!adConfig.masterAdsEnabled || !(adConfig.rewardedAd?.enabled ?? true)) return true;
    const cooldownMins = adConfig.rewardedAd?.cooldownMinutes ?? 30;
    return isRewardedAdCooldownActive(cooldownMins);
  }, [isVip, adConfig.masterAdsEnabled, adConfig.rewardedAd?.enabled, adConfig.rewardedAd?.cooldownMinutes]);

  const [isAdWatched, setIsAdWatched] = useState<boolean>(() => isRewardedAdUnlocked());
  const [isPrerollActive, setIsPrerollActive] = useState<boolean>(() => shouldDisplayAd('preroll'));
  const [vipModalOpen, setVipModalOpen] = useState<boolean>(false);

  // Simulated Video playback and Mid-Roll triggering state
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration] = useState<number>(1440); // Standard anime is 24 mins = 1440s
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [triggeredMidrolls, setTriggeredMidrolls] = useState<number[]>([]);
  const [isMidrollActive, setIsMidrollActive] = useState<boolean>(false);

  const isMovie =
    anime?.type?.toLowerCase() === 'movie' ||
    anime?.genres?.some((g) => g.name.toLowerCase() === 'movie') ||
    (anime?.duration && anime.duration.toLowerCase().includes('hr')) ||
    (anime?.episodes === 1 && !anime.seasons);

  const currentEpNumber = selectedEpisode?.number || 1;
  const currentEpSeason = selectedEpisode?.season || 1;
  const totalEpisodesCount = anime?.episodes || loadedEpisodes.length || 12;

  // Check VIP Lock Status for current anime & episode
  const lockStatus = useMemo(() => {
    if (!anime) return { locked: false };
    return isEpisodeLocked(anime.slug || anime.id, currentEpNumber);
  }, [anime?.slug, anime?.id, currentEpNumber, isVip]);

  const hasActiveAd = !isVip && (
    (!isAdWatched && adConfig.masterAdsEnabled && (adConfig.rewardedAd?.enabled ?? true)) ||
    (isPrerollActive && adConfig.preroll.enabled) ||
    (isMidrollActive && (adConfig.midroll?.enabled ?? true) && adConfig.masterAdsEnabled)
  );

  useEffect(() => {
    if (hasActiveAd) {
      setIsPlaying(false);
    }
  }, [hasActiveAd]);

  useEffect(() => {
    const unsubVip = subscribeToVip((u) => setIsVip(u.isVip));
    const unsubAdmin = subscribeToAdminState((st) => setAdConfig(st.ads));
    return () => {
      unsubVip();
      unsubAdmin();
    };
  }, []);

  // Auto-sync isAdWatched whenever VIP or Admin settings change
  useEffect(() => {
    if (isRewardedAdUnlocked()) {
      setIsAdWatched(true);
    }
  }, [isRewardedAdUnlocked]);

  // Playback timer tick
  useEffect(() => {
    if (!isPlaying || isEpisodeSwitching || isLoadingStreams || isPrerollActive || isMidrollActive || lockStatus?.locked || (!isAdWatched && !isVip)) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= duration) {
          clearInterval(interval);
          setIsPlaying(false);
          return duration;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, isEpisodeSwitching, isLoadingStreams, isPrerollActive, isMidrollActive, lockStatus?.locked, isAdWatched, isVip, duration]);

  // Mid-Roll trigger checker
  useEffect(() => {
    // Ad-Bypass safety enforced for VIPs or if ads are disabled globally
    if (isVip) return;
    
    const midrollConfig = adConfig.midroll;
    if (!midrollConfig || !midrollConfig.enabled || !adConfig.masterAdsEnabled) return;

    const intervalsMin = midrollConfig.intervalsMin || [];
    
    for (const min of intervalsMin) {
      const triggerSec = min * 60;
      // Trigger if currentTime reaches or exceeds triggerSec, and we haven't triggered this interval yet
      if (currentTime >= triggerSec && currentTime < triggerSec + 15 && !triggeredMidrolls.includes(min)) {
        setTriggeredMidrolls((prev) => [...prev, min]);
        setIsMidrollActive(true);
        setIsPlaying(false); // Pause simulated playback
        break;
      }
    }
  }, [currentTime, isVip, adConfig, triggeredMidrolls]);

  const handleSeek = (newTime: number) => {
    if (isVip || !adConfig.masterAdsEnabled || !(adConfig.midroll?.enabled ?? true)) {
      setCurrentTime(newTime);
      return;
    }

    const intervalsMin = adConfig.midroll?.intervalsMin || [];
    const skippedAdInterval = intervalsMin
      .sort((a, b) => a - b)
      .find((min) => {
        const triggerSec = min * 60;
        return triggerSec <= newTime && !triggeredMidrolls.includes(min);
      });

    if (skippedAdInterval !== undefined) {
      const triggerSec = skippedAdInterval * 60;
      setCurrentTime(triggerSec);
      setTriggeredMidrolls((prev) => [...prev, skippedAdInterval]);
      pendingSeekTimeRef.current = newTime;
      setIsMidrollActive(true);
      setIsPlaying(false);
    } else {
      setCurrentTime(newTime);
      // Reset triggered midrolls that occur after the new seeked time
      const midrollConfig = adConfig.midroll;
      if (midrollConfig) {
        const stillTriggered = triggeredMidrolls.filter(min => min * 60 <= newTime);
        setTriggeredMidrolls(stillTriggered);
      }
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset Preroll on episode switch for free users
  useEffect(() => {
    if (!isVip && shouldDisplayAd('preroll')) {
      setIsPrerollActive(true);
    } else {
      setIsPrerollActive(false);
    }
    // Reset simulated playback time and triggered midrolls
    setCurrentTime(0);
    setTriggeredMidrolls([]);
    setIsMidrollActive(false);
    setIsPlaying(true);
  }, [currentEpNumber, anime?.id, isVip]);

  // Available seasons list
  const availableSeasons = useMemo(() => {
    const fromEps = (
      Array.from(new Set(loadedEpisodes.map((ep) => ep.season || 1))) as number[]
    ).sort((a: number, b: number) => a - b);
    if (fromEps.length > 0) return fromEps;
    const seasonCount = anime?.seasons || 1;
    return Array.from({ length: seasonCount }, (_, i) => i + 1);
  }, [loadedEpisodes, anime?.seasons]);

  // Filtered episodes based on active season
  const filteredEpisodes = useMemo(() => {
    if (selectedSeason === 'all') return loadedEpisodes;
    return loadedEpisodes.filter((ep) => (ep.season || 1) === selectedSeason);
  }, [loadedEpisodes, selectedSeason]);

  // Season episode counts
  const seasonEpisodeCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    availableSeasons.forEach((s) => {
      counts[s] = loadedEpisodes.filter((ep) => (ep.season || 1) === s).length;
    });
    return counts;
  }, [loadedEpisodes, availableSeasons]);

  // Sync selected season when playing episode changes or anime changes
  useEffect(() => {
    if (selectedEpisode?.season) {
      setSelectedSeason(selectedEpisode.season);
    } else {
      setSelectedSeason(1);
    }
  }, [anime?.id, anime?.slug, selectedEpisode?.season, selectedEpisode?.number]);

  // Fallback logic: If currently selected season does not exist for the newly loaded anime, default to lowest available season
  useEffect(() => {
    if (selectedSeason === 'all') return;
    if (availableSeasons.length > 0 && !availableSeasons.includes(selectedSeason as number)) {
      const fallback =
        selectedEpisode?.season && availableSeasons.includes(selectedEpisode.season)
          ? selectedEpisode.season
          : availableSeasons[0] || 1;
      setSelectedSeason(fallback);
    }
  }, [availableSeasons, selectedSeason, selectedEpisode?.season]);

  // Refresh progress state
  const refreshProgress = () => {
    if (!anime) return;
    const watched = getWatchedEpisodes(anime.id);
    setWatchedEpisodes(watched);
    setProgressSummary(getAnimeProgress(anime.id, anime.episodes || loadedEpisodes.length));
  };

  useEffect(() => {
    if (!anime) return;
    refreshProgress();
    return subscribeToProgressUpdates(refreshProgress);
  }, [anime?.id, anime?.episodes, loadedEpisodes.length, selectedSeason]);

  // Pre-fetch adjacent episodes in the background whenever current episode or anime changes
  useEffect(() => {
    if (!isOpen || !anime) return;
    prefetchAdjacentEpisodes(anime.slug || anime.id, currentEpNumber);
  }, [isOpen, anime?.slug, anime?.id, currentEpNumber]);

  // Safety fallback for episode switching spinner
  useEffect(() => {
    if (isEpisodeSwitching) {
      const timer = setTimeout(() => {
        setIsEpisodeSwitching(false);
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [isEpisodeSwitching]);

  // Load episodes list if not provided
  useEffect(() => {
    if (!isOpen || !anime) return;

    if (episodes && episodes.length > 0) {
      setLoadedEpisodes(episodes);
      return;
    }

    let isMounted = true;
    const animeIdOrSlug = anime.slug || anime.id;

    getAnimeEpisodes(animeIdOrSlug)
      .then((eps) => {
        if (!isMounted) return;
        if (eps && eps.length > 0) {
          setLoadedEpisodes(eps);
        } else {
          // Generate fallback episodes from total count
          const count = anime.episodes || 12;
          const fallbackEps: AnimeEpisode[] = Array.from({ length: count }, (_, i) => ({
            id: `ep-${i + 1}`,
            number: i + 1,
            season: 1,
            title: `Episode ${i + 1}`,
          }));
          setLoadedEpisodes(fallbackEps);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        const count = anime.episodes || 12;
        const fallbackEps: AnimeEpisode[] = Array.from({ length: count }, (_, i) => ({
          id: `ep-${i + 1}`,
          number: i + 1,
          season: 1,
          title: `Episode ${i + 1}`,
        }));
        setLoadedEpisodes(fallbackEps);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, anime?.id, anime?.slug, anime?.episodes, episodes?.length]);

  // Load live streams for anime once per anime slug (independent of currentEpNumber)
  useEffect(() => {
    if (!isOpen || !anime) return;

    let isMounted = true;
    const slug = anime.slug || String(anime.id);

    // If streams are already loaded in memory for this exact anime, avoid re-fetching
    const cached = getCachedStreams(slug);
    if (cached && cached.servers && cached.servers.length > 0) {
      if (lastFetchedSlugRef.current !== slug || streamServers.length === 0) {
        setStreamServers(cached.servers);
        setSelectedServerIndex(0);
        lastFetchedSlugRef.current = slug;
      }
      setIsLoadingStreams(false);
      return;
    }

    // Otherwise fetch fresh data without blocking
    setIsLoadingStreams(true);
    getAnimeStreams(slug)
      .then((res) => {
        if (!isMounted) return;
        if (res && res.servers && res.servers.length > 0) {
          setStreamServers(res.servers);
          setSelectedServerIndex(0);
          lastFetchedSlugRef.current = slug;
          // Preconnect to stream hosts
          res.servers.forEach((s) => {
            if (s.name) preconnectDomain(s.name);
            s.episodes?.forEach((ep) => {
              if (ep.url) preconnectDomain(ep.url);
            });
          });
        } else {
          setStreamServers([]);
        }
      })
      .catch((err) => {
        console.warn('Streams fetch error', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingStreams(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, anime?.slug, anime?.id]);

  // Record view in backend on episode change
  useEffect(() => {
    if (!isOpen || !anime) return;
    const slug = anime.slug || String(anime.id);
    recordWatch(slug, selectedEpisode?.season || 1, currentEpNumber);
  }, [isOpen, anime?.slug, anime?.id, currentEpNumber, selectedEpisode?.season]);

  // Season watched counts
  const seasonWatchedCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    if (!anime) return counts;
    availableSeasons.forEach((s) => {
      const seasonEps = loadedEpisodes.filter((ep) => (ep.season || 1) === s);
      counts[s] = seasonEps.filter((ep) =>
        isEpisodeProgressWatched(anime.id, ep.season || 1, ep.number)
      ).length;
    });
    return counts;
  }, [loadedEpisodes, availableSeasons, watchedEpisodes, anime?.id]);

  const currentSeasonEpisodesCount = filteredEpisodes.length;
  const currentSeasonWatchedCount = useMemo(() => {
    if (!anime) return 0;
    return filteredEpisodes.filter((ep) =>
      isEpisodeProgressWatched(anime.id, ep.season || 1, ep.number)
    ).length;
  }, [filteredEpisodes, watchedEpisodes, anime?.id]);

  const currentSeasonPercentage =
    currentSeasonEpisodesCount > 0
      ? Math.min(
          100,
          Math.round((currentSeasonWatchedCount / currentSeasonEpisodesCount) * 100)
        )
      : 0;

  const isCurrentSeasonCompleted =
    currentSeasonEpisodesCount > 0 &&
    currentSeasonWatchedCount >= currentSeasonEpisodesCount;

  if (!isOpen || !anime) return null;

  // Instant Episode Switch Handler with immediate UI feedback and adjacent prefetch
  const handleSelectEpisode = (ep: AnimeEpisode) => {
    if (ep.number === currentEpNumber && (ep.season || 1) === currentEpSeason) return;
    setIsEpisodeSwitching(true);
    setLoadingEpNumber(ep.number);
    if (onSelectEpisode) {
      onSelectEpisode(ep);
    }
    prefetchAdjacentEpisodes(anime.slug || anime.id, ep.number);

    // Maintain unlock state if within cooldown timer or VIP
    if (isRewardedAdUnlocked()) {
      setIsAdWatched(true);
    } else {
      setIsAdWatched(false);
    }
  };

  // Switch to adjacent episode (prev / next)
  const handleNavigateEpisode = (delta: number) => {
    const targetList = filteredEpisodes.length > 0 ? filteredEpisodes : loadedEpisodes;
    const currentIndex = targetList.findIndex(
      (ep) => ep.number === currentEpNumber && (ep.season || 1) === currentEpSeason
    );
    const newIndex = currentIndex !== -1 ? currentIndex + delta : 0;
    if (newIndex >= 0 && newIndex < targetList.length) {
      handleSelectEpisode(targetList[newIndex]);
    }
  };

  // Toggle single episode watched
  const handleToggleWatched = (epOrNumber: AnimeEpisode | number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const epNum = typeof epOrNumber === 'number' ? epOrNumber : epOrNumber.number;
    const epSeason = typeof epOrNumber === 'number' ? currentEpSeason : (epOrNumber.season || 1);
    toggleEpisodeProgressWatched(anime, epSeason, epNum);
  };

  // Mark all previous episodes as watched up to current
  const handleMarkPreviousWatched = () => {
    for (let i = 1; i <= currentEpNumber; i++) {
      setEpisodeProgressWatched(anime, currentEpSeason, i, true);
    }
  };

  // Mark all episodes watched for current season / view
  const handleMarkAllWatched = (markWatched: boolean) => {
    if (selectedSeason === 'all') {
      availableSeasons.forEach((s) => {
        const count = seasonEpisodeCounts[s] || 12;
        markSeasonEpisodesWatched(anime, s, count, markWatched);
      });
    } else {
      markSeasonEpisodesWatched(
        anime,
        selectedSeason,
        currentSeasonEpisodesCount,
        markWatched
      );
    }
  };

  // Server switch handler - Server Change Ad Cooldown Fix
  const handleSelectServer = (idx: number) => {
    if (selectedServerIndex === idx) return;
    setIsEpisodeSwitching(true);
    setLoadingEpNumber(currentEpNumber);
    setSelectedServerIndex(idx);

    // Prevent excessive ads: Do NOT re-trigger ad if already unlocked within cooldown timer or VIP
    if (isRewardedAdUnlocked()) {
      setIsAdWatched(true);
    } else {
      setIsAdWatched(false);
    }
  };

  // Find active stream URL for current episode and selected server
  const activeServer = streamServers[selectedServerIndex] || streamServers[0];
  const activeServerEpisode = activeServer?.episodes?.find(
    (ep) =>
      ep.episode === currentEpNumber &&
      (ep.season ? ep.season === currentEpSeason : true)
  );

  const rawStreamUrl =
    activeServerEpisode?.url || selectedEpisode?.streamUrl || null;

  const isCurrentEpWatched = isEpisodeProgressWatched(
    anime.id,
    currentEpSeason,
    currentEpNumber
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/90 backdrop-blur-lg animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-neutral-950 border-0 sm:border border-neutral-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden text-neutral-100 flex flex-col max-h-[96vh] sm:max-h-[94vh]">
        {/* Compact Modal Header */}
        <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-neutral-800/80 flex items-center justify-between gap-3 bg-neutral-900/90 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 truncate">
            <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg shrink-0">
              <Tv className="w-4 h-4" />
            </div>
            <div className="truncate min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                {anime.titleEnglish || anime.title}
              </h3>
               <p className="text-[10px] sm:text-[11px] text-neutral-400 flex items-center gap-1.5 sm:gap-2 truncate">
                {isMovie ? (
                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-md font-bold text-[10px] uppercase tracking-wider">
                    Full Movie
                  </span>
                ) : (
                  <span className="text-rose-400 font-semibold">
                    EP {currentEpNumber}: {selectedEpisode?.title || `Episode ${currentEpNumber}`}
                  </span>
                )}
                {activeServer && (
                  <>
                    <span className="w-1 h-1 bg-neutral-600 rounded-full shrink-0" />
                    <span className="text-emerald-400 font-mono font-medium truncate">
                      {activeServer.name}
                    </span>
                  </>
                )}
                <span className="w-1 h-1 bg-neutral-600 rounded-full shrink-0" />
                <span className="text-neutral-300 font-semibold uppercase shrink-0">{quality}</span>
                <span className="w-1 h-1 bg-neutral-600 rounded-full shrink-0" />
                <span className="text-amber-400 font-semibold uppercase shrink-0">{subDub.toUpperCase()}</span>
              </p>
            </div>
          </div>

          {/* Top Quick Navigation & Close */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick Prev / Next Episode Buttons (Hidden for Movies) */}
            {!isMovie && (
              <div className="flex items-center bg-neutral-800 p-0.5 rounded-lg border border-neutral-700">
                <button
                  id="player-prev-ep-btn"
                  onClick={() => handleNavigateEpisode(-1)}
                  disabled={currentEpNumber <= 1}
                  className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors rounded"
                  title="Previous Episode"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-1.5 text-[10px] font-mono font-bold text-neutral-300">
                  {currentEpNumber}/{totalEpisodesCount}
                </span>
                <button
                  id="player-next-ep-btn"
                  onClick={() => handleNavigateEpisode(1)}
                  disabled={currentEpNumber >= totalEpisodesCount}
                  className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors rounded"
                  title="Next Episode"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Close Button */}
            <button
              id="close-player-modal-btn"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
              title="Close Player (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Container with Video + Controls + Episodes */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Centered 16:9 Video Player Container (Zero excess top space, perfectly 16:9) */}
          <div className="w-full bg-black flex flex-col items-center justify-center p-0 sm:p-2 bg-gradient-to-b from-black via-neutral-950 to-neutral-950">
            <div className="w-full max-w-4xl mx-auto aspect-video bg-neutral-950 sm:rounded-xl overflow-hidden relative border-0 sm:border border-neutral-800/80 shadow-2xl flex items-center justify-center">
              {/* VIP Paywall Gate Overlay */}
              {lockStatus.locked && !isVip ? (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 p-6 text-center animate-fadeIn select-none">
                  <div className="relative w-16 h-16 mb-3 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-2xl bg-amber-500/20 blur-xl animate-pulse" />
                    <div className="relative w-14 h-14 rounded-2xl bg-neutral-950 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/20">
                      <Crown className="w-7 h-7 fill-current" />
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
                    <Lock className="w-3 h-3" />
                    <span>VIP Premium Episode</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white max-w-sm">
                    Episode {currentEpNumber} is Reserved for VIP Members
                  </h3>
                  <p className="text-xs text-neutral-400 max-w-md mt-1.5 mb-5 leading-relaxed">
                    Upgrade to AnizenX VIP to stream this episode in 1080p Ultra HD with zero ads, high-speed servers, and instant playback.
                  </p>
                  <button
                    id="unlock-episode-vip-btn"
                    onClick={() => setVipModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-black font-black text-xs shadow-xl shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Unlock with VIP (From ₹99 / $1.49)</span>
                  </button>
                </div>
              ) : !isVip && !isAdWatched && adConfig.masterAdsEnabled && (adConfig.rewardedAd?.enabled ?? true) ? (
                <RewardedAdGate
                  animeTitle={anime.titleEnglish || anime.title}
                  episodeNumber={currentEpNumber}
                  adUrl={adConfig.rewardedAd?.adNetworkUrl || adConfig.playerBanner?.targetUrl || 'https://discord.gg/anizenx'}
                  rewardDurationMinutes={adConfig.rewardedAd?.cooldownMinutes ?? 30}
                  onRewardUnlocked={() => {
                    setRewardedAdUnlocked(adConfig.rewardedAd?.cooldownMinutes ?? 30);
                    setIsAdWatched(true);
                    setIsPlaying(true);
                    setIsPrerollActive(false);
                  }}
                  onOpenVipModal={() => setVipModalOpen(true)}
                />
              ) : isPrerollActive && !isVip && adConfig.preroll.enabled ? (
                <PrerollAdOverlay
                  config={adConfig.preroll}
                  onAdCompleted={() => setIsPrerollActive(false)}
                  onOpenVipModal={() => setVipModalOpen(true)}
                />
              ) : isMidrollActive && !isVip && (adConfig.midroll?.enabled ?? true) && adConfig.masterAdsEnabled ? (
                <MidrollAdOverlay
                  config={adConfig.midroll || {
                    enabled: true,
                    intervalsMin: [5, 15, 25],
                    durationSec: 15,
                    skipDelaySec: 5,
                    mediaType: 'video',
                    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                    title: 'Solo Leveling: Arise — Download Now!',
                    sponsorName: 'Netmarble Sponsored',
                    ctaText: 'Play Free On PC & Mobile',
                    ctaLink: 'https://sololeveling.netmarble.com/',
                  }}
                  onAdCompleted={() => {
                    setIsMidrollActive(false);
                    if (pendingSeekTimeRef.current !== null) {
                      setCurrentTime(pendingSeekTimeRef.current);
                      pendingSeekTimeRef.current = null;
                    }
                    setIsPlaying(true);
                  }}
                  onOpenVipModal={() => setVipModalOpen(true)}
                />
              ) : null}

              {/* Instant UI Feedback & Episode Switching Loader */}
              {isEpisodeSwitching && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-neutral-950/85 backdrop-blur-sm animate-fadeIn text-center p-4">
                  <div className="relative mb-3 flex items-center justify-center">
                    <div className="w-11 h-11 border-3 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
                    <Play className="w-4 h-4 text-rose-500 absolute fill-rose-500/30" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                    Loading Episode {loadingEpNumber}...
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-neutral-400 mt-1 font-mono flex items-center gap-1.5 justify-center">
                    <span className="text-emerald-400 font-semibold">{activeServer?.name || 'Fast Server'}</span>
                    <span>•</span>
                    <span className="text-rose-400 font-semibold uppercase">{quality}</span>
                    <span>•</span>
                    <span className="text-amber-400 font-semibold uppercase">{subDub.toUpperCase()}</span>
                  </p>
                  <span className="mt-2.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-mono animate-pulse">
                    ⚡ Fast Preloaded Stream
                  </span>
                </div>
              )}

              {hasActiveAd ? (
                <div className="w-full h-full bg-black absolute inset-0 z-20" />
              ) : isLoadingStreams ? (
                <div className="flex flex-col items-center gap-3 text-neutral-400 p-4">
                  <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs">Connecting to streaming server...</p>
                </div>
              ) : rawStreamUrl ? (
                !isEpisodeSwitching && (
                  <iframe
                    key={`stream-frame-${anime.id || anime.slug}-${currentEpNumber}-${selectedServerIndex}-${subDub}-${quality}`}
                    ref={iframeRef}
                    src={rawStreamUrl}
                    loading="lazy"
                    onLoad={() => setIsEpisodeSwitching(false)}
                    title={`${anime.title} - Episode ${currentEpNumber}`}
                    className="w-full h-full border-0 absolute inset-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                )
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-950 to-rose-950/40 p-4 sm:p-6 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-3 sm:mb-4 animate-pulse">
                    <Play className="w-6 h-6 sm:w-8 sm:h-8 ml-0.5 sm:ml-1" />
                  </div>
                  <h4 className="text-sm sm:text-lg font-bold text-white mb-1">
                    {anime.titleEnglish || anime.title}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-neutral-400 max-w-md mb-3 sm:mb-4">
                    Episode {currentEpNumber} playback stream ready. Connected via{' '}
                    {activeServer?.name || 'Backend Fast Server'} ({subDub.toUpperCase()})
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-neutral-800 text-neutral-300 text-[10px] sm:text-xs rounded-full border border-neutral-700">
                      ⚡ 1080p Ultra HD
                    </span>
                    <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-emerald-500/20 text-emerald-300 text-[10px] sm:text-xs rounded-full border border-emerald-500/30">
                      Live Stream Feed
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Interactive Player Seek Bar with Mid-roll Indicators */}
            <div className="w-full max-w-4xl mx-auto px-4 py-2.5 bg-neutral-950/80 sm:rounded-b-xl border-t border-neutral-900/50 flex flex-col sm:flex-row items-center gap-3 select-none">
              <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-between sm:justify-start">
                {/* Play/Pause Button */}
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white hover:text-rose-400 transition-colors cursor-pointer shrink-0 flex items-center justify-center border border-neutral-800"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                </button>

                {/* Time Elapsed */}
                <span className="text-[11px] font-mono font-bold text-rose-400 shrink-0 bg-rose-950/20 px-2 py-0.5 rounded border border-rose-900/30">
                  {formatTime(currentTime)}
                </span>
              </div>

              {/* Progress Slider Track */}
              <div 
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const width = rect.width;
                  const pct = Math.min(1, Math.max(0, clickX / width));
                  const nextTime = Math.round(pct * duration);
                  handleSeek(nextTime);
                }}
                className="flex-1 w-full h-3 bg-neutral-800 rounded-full relative cursor-pointer group hover:bg-neutral-700/80 transition-all border border-neutral-900 shadow-inner"
              >
                {/* Progress bar fill */}
                <div 
                  className="h-full bg-gradient-to-r from-rose-600 to-rose-500 rounded-full relative"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                >
                  {/* Slider Knob */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-rose-600 scale-0 group-hover:scale-100 transition-transform" />
                </div>

                {/* Yellow Mid-roll markers (Disabled for VIP users) */}
                {!isVip && adConfig.midroll?.enabled && adConfig.masterAdsEnabled && (adConfig.midroll.intervalsMin || []).map((min) => {
                  const triggerSec = min * 60;
                  if (triggerSec >= duration) return null;
                  const pct = (triggerSec / duration) * 100;
                  const isFired = triggeredMidrolls.includes(min);
                  return (
                    <div 
                      key={min}
                      className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-neutral-950 shadow-md transform -translate-x-1/2 cursor-pointer z-10 transition-all hover:scale-150 ${
                        isFired ? 'bg-amber-600 border-amber-300' : 'bg-amber-400 border-white animate-pulse'
                      }`}
                      style={{ left: `${pct}%` }}
                      title={`Ad Break: ${min} min`}
                    />
                  );
                })}
              </div>

              {/* Time Total */}
              <span className="text-[11px] font-mono font-bold text-neutral-400 shrink-0 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800 self-end sm:self-auto ml-auto sm:ml-0">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Clean Server & Controls Bar directly below the centered 16:9 video container */}
          <div className="bg-neutral-900/95 border-y border-neutral-800/80 px-3.5 sm:px-5 py-2.5 sm:py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-inner">
            {/* Single API Source Server Tag: AnimeSalt CDN */}
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 font-bold text-xs flex items-center gap-1.5 mr-1 shrink-0">
                <Server className="w-3.5 h-3.5 text-rose-500" />
                Server Source:
              </span>
              <div className="px-3 py-1 rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span>{activeServer?.name || 'AnimeSalt CDN'}</span>
              </div>
            </div>

            {/* Right: Sub/Dub Toggle + Quality + Episode Watched + Direct Player */}
            <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-end">
              {/* Sub / Dub Toggle */}
              <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-xs font-bold">
                <button
                  id="player-sub-toggle-btn"
                  onClick={() => setSubDub('sub')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    subDub === 'sub'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  SUB
                </button>
                <button
                  id="player-dub-toggle-btn"
                  onClick={() => setSubDub('dub')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    subDub === 'dub'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  DUB
                </button>
              </div>

              {/* Quality Picker */}
              <div className="hidden sm:flex items-center gap-1 bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-[11px] font-bold">
                {(['1080p', '720p', '480p'] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                      quality === q
                        ? 'bg-rose-600 text-white'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Mark Current Episode Watched */}
              <button
                id="toggle-current-ep-watched-btn"
                onClick={() => handleToggleWatched(currentEpNumber)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  isCurrentEpWatched
                    ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30'
                    : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border-neutral-800 hover:text-white'
                }`}
                title={isCurrentEpWatched ? 'Mark EP as unwatched' : 'Mark EP as watched'}
              >
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    isCurrentEpWatched ? 'text-emerald-400' : 'text-neutral-400'
                  }`}
                />
                <span>{isCurrentEpWatched ? 'EP Watched' : 'Mark Watched'}</span>
              </button>

              {/* Direct Open Link */}
              {rawStreamUrl && (
                <a
                  href={rawStreamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg border border-neutral-800 transition-colors"
                  title="Open direct player stream in a new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Ad Banner Below Player (Bypassed if user is VIP) */}
          <AdBanner
            placement="player"
            onOpenVipModal={() => setVipModalOpen(true)}
            className="px-3.5 sm:px-5 py-2"
          />

          {/* Episode Progress & Episode Browser Section (Hidden for Movies) */}
          {!isMovie ? (
            <div className="p-3.5 sm:p-5 space-y-3.5 bg-neutral-950">
              {/* Season Selector directly above the episode list/progress tracker */}
              <div className="bg-neutral-900/60 p-3 rounded-2xl border border-neutral-800/80">
                <SeasonSelector
                  availableSeasons={availableSeasons}
                  selectedSeason={selectedSeason}
                  onSelectSeason={(s) => setSelectedSeason(s)}
                  seasonEpisodeCounts={seasonEpisodeCounts}
                  totalEpisodesCount={totalEpisodesCount}
                  seasonWatchedCounts={seasonWatchedCounts}
                  totalWatchedCount={watchedEpisodes.length}
                  showAllOption={availableSeasons.length > 1}
                />
              </div>

              {/* Progress Header & Batch Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-neutral-900/80 p-3 rounded-xl border border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="min-w-0">
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
                      <span className="text-[10px] font-mono text-neutral-400 font-bold ml-1">
                        ({currentSeasonPercentage}%)
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-40 sm:w-56 bg-neutral-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isCurrentSeasonCompleted ? 'bg-emerald-400' : 'bg-rose-500'
                        }`}
                        style={{ width: `${currentSeasonPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Mark Previous, Mark All, Toggle View */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={handleMarkPreviousWatched}
                    className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg text-[11px] font-semibold border border-neutral-700 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Mark all episodes up to the currently playing episode as watched"
                  >
                    <CheckCheck className="w-3 h-3 text-rose-400" />
                    Mark 1..{currentEpNumber} Watched
                  </button>

                  <button
                    onClick={() => handleMarkAllWatched(!isCurrentSeasonCompleted)}
                    className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg text-[11px] font-semibold border border-neutral-700 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {isCurrentSeasonCompleted ? (
                      <>
                        <RotateCcw className="w-3 h-3 text-neutral-400" />
                        Clear Season
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        Mark Season Watched
                      </>
                    )}
                  </button>

                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-neutral-900 p-0.5 rounded-lg border border-neutral-800">
                    <button
                      onClick={() => setViewMode('rows')}
                      className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                        viewMode === 'rows' ? 'bg-rose-600 text-white' : 'text-neutral-400 hover:text-white'
                      }`}
                      title="Detailed Episode Rows"
                    >
                      <List className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setViewMode('compact')}
                      className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                        viewMode === 'compact' ? 'bg-rose-600 text-white' : 'text-neutral-400 hover:text-white'
                      }`}
                      title="Compact Chips"
                    >
                      <Grid className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Episode List Rendering */}
              {filteredEpisodes.length > 0 ? (
                <div>
                  {viewMode === 'rows' ? (
                    /* Detailed Episode Rows with Watched Toggle on Each Row */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-1 scrollbar-thin">
                      {filteredEpisodes.map((ep) => {
                        const isActive =
                          currentEpNumber === ep.number &&
                          (ep.season ? (ep.season || 1) === currentEpSeason : true);
                        const isWatched = isEpisodeProgressWatched(
                          anime.id,
                          ep.season || 1,
                          ep.number
                        );
                        const epLock = anime ? isEpisodeLocked(anime.slug || anime.id, ep.number) : { locked: false };

                        return (
                          <div
                            key={ep.id || `${ep.season || 1}_${ep.number}`}
                            id={`episode-row-s${ep.season || 1}-ep${ep.number}`}
                            onClick={() => handleSelectEpisode(ep)}
                            className={`p-2 sm:p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all cursor-pointer group ${
                              isActive
                                ? 'bg-rose-950/40 border-rose-500 shadow-md shadow-rose-950/30'
                                : epLock.locked && !isVip
                                ? 'bg-amber-950/20 hover:bg-amber-950/30 border-amber-500/30 hover:border-amber-500/50'
                                : 'bg-neutral-900/60 hover:bg-neutral-800/80 border-neutral-800 hover:border-neutral-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 truncate">
                              {/* Episode number badge */}
                              <span
                                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                                  isActive
                                    ? 'bg-rose-600 text-white'
                                    : epLock.locked && !isVip
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                    : isWatched
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-neutral-800 text-neutral-300'
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
                                    isActive
                                      ? 'text-rose-300 font-bold'
                                      : epLock.locked && !isVip
                                      ? 'text-amber-200'
                                      : isWatched
                                      ? 'text-neutral-300'
                                      : 'text-white'
                                  }`}
                                >
                                  <span>
                                    {ep.season && ep.season > 1
                                      ? `S${ep.season} • Episode ${ep.number}`
                                      : ep.title || `Episode ${ep.number}`}
                                  </span>
                                  {epLock.locked && !isVip && (
                                    <span className="px-1.5 py-0.2 bg-amber-500/20 border border-amber-500/40 text-[9px] font-mono text-amber-400 rounded font-bold">
                                      VIP
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[10px] text-neutral-500 flex items-center gap-1.5">
                                  {isActive && (
                                    <span className="text-rose-400 font-bold flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                                      Now Playing
                                    </span>
                                  )}
                                  {ep.aired && <span>{ep.aired}</span>}
                                </p>
                              </div>
                            </div>

                            {/* Action area on each row: Mark as Watched button */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                id={`row-mark-watched-s${ep.season || 1}-ep-${ep.number}-btn`}
                                onClick={(e) => handleToggleWatched(ep, e)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                                  isWatched
                                    ? 'bg-emerald-600/20 hover:bg-rose-600/20 text-emerald-300 hover:text-rose-300 border-emerald-500/40 hover:border-rose-500/40'
                                    : 'bg-neutral-800 hover:bg-emerald-600/20 text-neutral-400 hover:text-emerald-300 border-neutral-700 hover:border-emerald-500/40'
                                }`}
                                title={isWatched ? 'Click to mark unwatched' : 'Click to mark as watched'}
                              >
                                <CheckCircle2
                                  className={`w-3 h-3 ${
                                    isWatched ? 'text-emerald-400 fill-emerald-500/20' : 'text-neutral-500'
                                  }`}
                                />
                                <span>{isWatched ? 'Watched' : 'Mark'}</span>
                              </button>

                              {/* Play trigger indicator */}
                              <div className="p-1 text-neutral-500 group-hover:text-rose-400">
                                <Play className="w-3.5 h-3.5 fill-current" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Compact Carousel of Episode Chips with Watched Badges */
                    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-thin">
                      {filteredEpisodes.map((ep) => {
                        const isActive =
                          currentEpNumber === ep.number &&
                          (ep.season ? (ep.season || 1) === currentEpSeason : true);
                        const isWatched = isEpisodeProgressWatched(
                          anime.id,
                          ep.season || 1,
                          ep.number
                        );
                        const epLock = anime ? isEpisodeLocked(anime.slug || anime.id, ep.number) : { locked: false };

                        return (
                          <div
                            key={ep.id || `${ep.season || 1}_${ep.number}`}
                            className="relative shrink-0 group flex items-center"
                          >
                            <button
                              onClick={() => handleSelectEpisode(ep)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                                isActive
                                  ? 'bg-rose-600 border-rose-500 text-white font-bold shadow-md shadow-rose-600/30'
                                  : epLock.locked && !isVip
                                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                                  : isWatched
                                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                                  : 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
                              }`}
                            >
                              {epLock.locked && !isVip && (
                                <Crown className="w-3 h-3 text-amber-400 fill-amber-400/40 shrink-0" />
                              )}
                              <span>
                                {ep.season && ep.season > 1 ? `S${ep.season} ` : ''}EP {ep.number}
                              </span>
                              {isWatched && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                            </button>

                            {/* Quick hover toggle button */}
                            <button
                              onClick={(e) => handleToggleWatched(ep, e)}
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-neutral-900 border border-neutral-700 hover:border-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                              title={isWatched ? 'Mark unwatched' : 'Mark watched'}
                            >
                              <Check
                                className={`w-2.5 h-2.5 ${
                                  isWatched ? 'text-emerald-400' : 'text-neutral-400'
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-neutral-500 bg-neutral-900/40 rounded-xl border border-neutral-800">
                  <p className="text-xs">No episodes available for this season.</p>
                </div>
              )}
            </div>
          ) : (
            /* Movie Feature Badge / Action Bar */
            <div className="p-4 sm:p-6 bg-neutral-950 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-900">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30">
                  <Play className="w-6 h-6 fill-rose-400/30" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Feature Film Experience</span>
                    <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-extrabold uppercase rounded-full">
                      Full Movie
                    </span>
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Enjoy uninterrupted 1080p cinematic playback with multi-server stream fallback.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleToggleWatched(1)}
                  className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    isCurrentEpWatched
                      ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{isCurrentEpWatched ? 'Movie Completed' : 'Mark Watched'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VIP Upgrade Paywall Modal */}
      <VipUpgradeModal
        isOpen={vipModalOpen}
        onClose={() => setVipModalOpen(false)}
        initialPlanId="plan_pro"
        sourceContext="player_lock"
      />
    </div>
  );
};

export default VideoPlayerModal;

