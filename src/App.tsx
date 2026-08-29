import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  Star,
  Sparkles,
  TrendingUp,
  Award,
  Layers,
  ChevronRight,
  Filter,
  RefreshCw,
  Server,
  Play,
  Bookmark,
  CheckCircle2,
  ShieldAlert,
  Crown,
  Zap,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { AnimeItem, AnimeGenre, AnimeEpisode, ApiProviderConfig } from './types/anime';
import {
  getHomeAnime,
  getTopAnime,
  getSeasonNow,
  getPopularAnime,
  getAnimeGenres,
  searchAnime,
  FALLBACK_BACKEND_CATALOG,
} from './services/animeApi';
import { getActiveProvider, BACKEND_BASE_URL } from './services/apiConfig';
import { getWatchlist, subscribeToWatchlistUpdates } from './services/watchlistStore';

import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { AnimeCard } from './components/AnimeCard';
import { AnimeDetailModal } from './components/AnimeDetailModal';
import { SearchModal } from './components/SearchModal';
import { ApiSettingsModal } from './components/ApiSettingsModal';
import { AdminModal } from './components/AdminModal';
import { WatchlistView } from './components/WatchlistView';
import { ScheduleView } from './components/ScheduleView';
import { Pagination } from './components/Pagination';
import { Footer } from './components/Footer';
import { PlayerSkeletonModal } from './components/PlayerSkeletonModal';
import { AdBanner } from './components/AdBanner';
import { VipUpgradeModal } from './components/VipUpgradeModal';
import { UserProfileModal } from './components/UserProfileModal';
import { MaintenanceOverlay } from './components/MaintenanceOverlay';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { initPwaService } from './services/pwaService';
import { isVipActive, subscribeToVip, getVipProfile, getVipPlans } from './services/vipStore';
import { VipUser } from './types/admin';
import { getAdminConfig, subscribeToAdminConfig, AdminConfig } from './services/adminStore';
import { motion, AnimatePresence } from 'motion/react';

// Non-blocking Lazy loaded Video Player Component
const VideoPlayerModal = React.lazy(() => import('./components/VideoPlayerModal'));

const CATALOG_ITEMS_PER_PAGE = 18;

// Motion variants for smooth staggered fade-in and slide-up of anime cards
const genreGridContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.03,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

const genreCardItemVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.96,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 24,
      stiffness: 280,
      mass: 0.8,
    },
  },
};

export default function App() {
  const [activeView, setActiveView] = useState<
    'home' | 'top' | 'airing' | 'schedule' | 'watchlist' | 'genres'
  >('home');

  // Anime Data Collections
  const [spotlights, setSpotlights] = useState<AnimeItem[]>(FALLBACK_BACKEND_CATALOG);
  const [homeCatalog, setHomeCatalog] = useState<AnimeItem[]>([]);
  const [trendingAnime, setTrendingAnime] = useState<AnimeItem[]>([]);
  const [topRanked, setTopRanked] = useState<AnimeItem[]>([]);
  const [genresList, setGenresList] = useState<AnimeGenre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<AnimeGenre | null>(null);
  const [genreAnimeList, setGenreAnimeList] = useState<AnimeItem[]>([]);

  // Pagination for Home Catalog Section
  const [catalogPage, setCatalogPage] = useState<number>(1);
  const catalogSectionRef = useRef<HTMLElement>(null);

  // Modals & Active state
  const [selectedAnimeId, setSelectedAnimeId] = useState<string | number | null>(null);
  const [selectedAnimeForDetails, setSelectedAnimeForDetails] = useState<AnimeItem | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false);
  const [playerModalOpen, setPlayerModalOpen] = useState<boolean>(false);
  const [playerAnime, setPlayerAnime] = useState<AnimeItem | null>(null);
  const [playerEpisode, setPlayerEpisode] = useState<AnimeEpisode | null>(null);
  const [apiModalOpen, setApiModalOpen] = useState<boolean>(false);
  const [adminModalOpen, setAdminModalOpen] = useState<boolean>(false);
  const [vipModalOpen, setVipModalOpen] = useState<boolean>(false);
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<VipUser>(getVipProfile());
  const [isVip, setIsVip] = useState<boolean>(isVipActive());
  const [isAdmin, setIsAdmin] = useState<boolean>(getVipProfile().email === 'sagars19585@gmail.com');
  const [adminConfig, setAdminConfig] = useState<AdminConfig>(getAdminConfig());

  // Active API Provider
  const [activeProvider, setActiveProvider] = useState<ApiProviderConfig>(getActiveProvider());
  const [watchlistCount, setWatchlistCount] = useState<number>(getWatchlist().length);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize PWA and Subscriptions
  useEffect(() => {
    initPwaService();
    const unsubVip = subscribeToVip((u) => {
      setUserProfile(u);
      setIsVip(u.isVip);
      setIsAdmin(u.email === 'sagars19585@gmail.com');
    });
    const unsubAdmin = subscribeToAdminConfig((cfg) => setAdminConfig(cfg));
    return () => {
      unsubVip();
      unsubAdmin();
    };
  }, []);

  // Global 3rd Party Script Injection (Ad-Bypass security enforced)
  useEffect(() => {
    const purgeOldScripts = () => {
      document.querySelectorAll('[data-ad-network-script]').forEach((el) => el.remove());
    };

    // If active VIP or ads disabled globally, ensure NO ad scripts exist!
    if (isVip || !adminConfig?.ads?.masterAdsEnabled) {
      purgeOldScripts();
      return;
    }

    purgeOldScripts();

    const injectScriptContent = (htmlContent: string, target: 'head' | 'body') => {
      if (!htmlContent) return;
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${htmlContent}</div>`, 'text/html');
        const container = doc.querySelector('div');
        if (!container) return;

        Array.from(container.childNodes).forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            if (element.tagName.toLowerCase() === 'script') {
              const script = document.createElement('script');
              Array.from(element.attributes).forEach((attr) => script.setAttribute(attr.name, attr.value));
              script.innerHTML = element.innerHTML;
              script.setAttribute('data-ad-network-script', target);
              if (target === 'head') {
                document.head.appendChild(script);
              } else {
                document.body.appendChild(script);
              }
            } else {
              const el = element.cloneNode(true) as HTMLElement;
              el.setAttribute('data-ad-network-script', target);
              if (target === 'head') {
                document.head.appendChild(el);
              } else {
                document.body.appendChild(el);
              }
            }
          }
        });
      } catch (err) {
        console.error('Error injecting custom scripts:', err);
      }
    };

    // Inject head and footer scripts safely
    if (adminConfig?.ads?.headerCustomScripts) {
      injectScriptContent(adminConfig.ads.headerCustomScripts, 'head');
    }
    if (adminConfig?.ads?.bodyCustomScripts) {
      injectScriptContent(adminConfig.ads.bodyCustomScripts, 'body');
    }
  }, [
    isVip,
    adminConfig?.ads?.masterAdsEnabled,
    adminConfig?.ads?.headerCustomScripts,
    adminConfig?.ads?.bodyCustomScripts
  ]);

  // Redirect non-admins trying to access /admin or #admin
  useEffect(() => {
    const handleAdminUrlProtection = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const isAdminUrl = path === '/admin' || path.startsWith('/admin/') || hash === '#admin' || hash === '#admin-panel';
      
      if (isAdminUrl) {
        if (!isAdmin) {
          const profile = getVipProfile();
          const loaded = profile.userId && !profile.userId.startsWith('guest_');
          
          if (loaded && profile.email !== 'sagars19585@gmail.com') {
            window.history.replaceState(null, '', '/');
            setAdminModalOpen(false);
          } else if (!loaded) {
            const timer = setTimeout(() => {
              const currentProfile = getVipProfile();
              const stillGuest = !currentProfile.email || currentProfile.userId.startsWith('guest_');
              if (stillGuest || currentProfile.email !== 'sagars19585@gmail.com') {
                window.history.replaceState(null, '', '/');
                setAdminModalOpen(false);
              }
            }, 1500);
            return () => clearTimeout(timer);
          }
        }
      }
    };

    handleAdminUrlProtection();
    window.addEventListener('popstate', handleAdminUrlProtection);
    window.addEventListener('hashchange', handleAdminUrlProtection);
    return () => {
      window.removeEventListener('popstate', handleAdminUrlProtection);
      window.removeEventListener('hashchange', handleAdminUrlProtection);
    };
  }, [isAdmin]);

  // Initial Data Fetch directly from https://animex-nu.vercel.app
  const loadInitialData = async () => {
    setIsLoading(true);
    setCatalogPage(1);
    try {
      const [homeRes, trendRes, topRes, genresRes] = await Promise.allSettled([
        getHomeAnime(),
        getPopularAnime(1),
        getTopAnime(1),
        getAnimeGenres(),
      ]);

      if (homeRes.status === 'fulfilled' && homeRes.value.data.length > 0) {
        setHomeCatalog(homeRes.value.data);
        setSpotlights(homeRes.value.data.slice(0, 6));
      } else {
        setHomeCatalog(FALLBACK_BACKEND_CATALOG);
        setSpotlights(FALLBACK_BACKEND_CATALOG.slice(0, 6));
      }

      if (trendRes.status === 'fulfilled' && trendRes.value.data.length > 0) {
        setTrendingAnime(trendRes.value.data);
      } else {
        setTrendingAnime(FALLBACK_BACKEND_CATALOG);
      }

      if (topRes.status === 'fulfilled' && topRes.value.data.length > 0) {
        setTopRanked(topRes.value.data);
      } else {
        setTopRanked(FALLBACK_BACKEND_CATALOG);
      }

      if (genresRes.status === 'fulfilled' && genresRes.value.length > 0) {
        setGenresList(genresRes.value);
      }
    } catch (err) {
      console.error('Failed to load anime data from backend', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [activeProvider.baseUrl]);

  useEffect(() => {
    const updateCount = () => {
      setWatchlistCount(getWatchlist().length);
    };
    updateCount();
    return subscribeToWatchlistUpdates(updateCount);
  }, []);

  // Dynamic Pagination calculations for Full Anime Catalog
  const totalCatalogPages = Math.max(1, Math.ceil(homeCatalog.length / CATALOG_ITEMS_PER_PAGE));
  const startCatalogIndex = (catalogPage - 1) * CATALOG_ITEMS_PER_PAGE;
  const currentCatalogItems = homeCatalog.slice(
    startCatalogIndex,
    startCatalogIndex + CATALOG_ITEMS_PER_PAGE
  );

  // Handle Catalog Page Change with smooth scroll to top of section
  const handleCatalogPageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalCatalogPages) return;
    setCatalogPage(newPage);
    setTimeout(() => {
      if (catalogSectionRef.current) {
        catalogSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        const el = document.getElementById('full-anime-catalog-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }, 30);
  };

  // Handle Genre selection & load genre anime
  const handleSelectGenre = async (genre: AnimeGenre) => {
    setSelectedGenre(genre);
    setActiveView('genres');
    setIsLoading(true);
    try {
      const res = await searchAnime('', { genres: [genre.mal_id || 0], limit: 30 });
      setGenreAnimeList(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Support URL routing for /admin, /vip, /anime/:id and handle browser back/forward
  useEffect(() => {
    const handleUrlRoute = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;

      // 1. /admin Route or #admin Hash
      if (
        path === '/admin' ||
        path.startsWith('/admin/') ||
        hash === '#admin' ||
        hash === '#admin-panel'
      ) {
        if (getVipProfile().email === 'sagars19585@gmail.com') {
          setAdminModalOpen(true);
        }
      }

      // 2. /vip or /plans or #vip or #plans Route
      if (
        path === '/vip' ||
        path.startsWith('/vip/') ||
        path === '/plans' ||
        path.startsWith('/plans/') ||
        path === '/pricing' ||
        hash === '#vip' ||
        hash === '#plans' ||
        hash === '#pricing' ||
        hash === '#upgrade'
      ) {
        setVipModalOpen(true);
      }

      // 3. /profile or /account or /dashboard or #profile or #account
      if (
        path === '/profile' ||
        path.startsWith('/profile/') ||
        path === '/account' ||
        path.startsWith('/account/') ||
        path === '/dashboard' ||
        path === '/user' ||
        hash === '#profile' ||
        hash === '#account' ||
        hash === '#dashboard' ||
        hash === '#user'
      ) {
        setProfileModalOpen(true);
      }

      // 4. /search or #search
      if (path === '/search' || hash === '#search') {
        setSearchModalOpen(true);
      }

      // 5. /anime/:id
      if (path.startsWith('/anime/')) {
        const id = path.replace('/anime/', '').trim();
        if (id) {
          setSelectedAnimeId(id);
        }
      }
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    window.addEventListener('hashchange', handleUrlRoute);

    // Global keyboard shortcuts: Ctrl+Shift+A (Admin), Ctrl+Shift+V (VIP), Ctrl+Shift+P (Profile)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleOpenAdmin();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handleOpenVip();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleOpenProfile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handleUrlRoute);
      window.removeEventListener('hashchange', handleUrlRoute);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleOpenAdmin = () => {
    if (getVipProfile().email !== 'sagars19585@gmail.com') {
      console.warn("Access denied. Super Admin privilege required.");
      return;
    }
    setAdminModalOpen(true);
    if (window.location.pathname !== '/admin') {
      window.history.pushState({ modal: 'admin' }, '', '/admin');
    }
  };

  const handleCloseAdmin = () => {
    setAdminModalOpen(false);
    if (window.location.pathname === '/admin') {
      window.history.pushState(null, '', '/');
    }
  };

  const handleOpenVip = () => {
    setVipModalOpen(true);
    if (window.location.pathname !== '/vip' && window.location.pathname !== '/plans') {
      window.history.pushState({ modal: 'vip' }, '', '/vip');
    }
  };

  const handleCloseVip = () => {
    setVipModalOpen(false);
    if (window.location.pathname === '/vip' || window.location.pathname === '/plans') {
      window.history.pushState(null, '', '/');
    }
  };

  const handleOpenProfile = () => {
    setProfileModalOpen(true);
    if (window.location.pathname !== '/profile' && window.location.pathname !== '/account') {
      window.history.pushState({ modal: 'profile' }, '', '/profile');
    }
  };

  const handleCloseProfile = () => {
    setProfileModalOpen(false);
    if (window.location.pathname === '/profile' || window.location.pathname === '/account' || window.location.pathname === '/user') {
      window.history.pushState(null, '', '/');
    }
  };

  const lastWatchClickRef = useRef<number>(0);

  const handleOpenAnimeDetails = (anime: AnimeItem) => {
    const animeIdentifier = anime.slug || anime.id;
    setSelectedAnimeId(animeIdentifier);
    setSelectedAnimeForDetails(anime);
    if (window.location.pathname !== `/anime/${animeIdentifier}`) {
      window.history.pushState({ animeId: animeIdentifier }, '', `/anime/${animeIdentifier}`);
    }
  };

  const handleWatchTrailer = (anime: AnimeItem, episode?: AnimeEpisode) => {
    const now = Date.now();
    // 300ms debounce guard to prevent multiple heavy render cycles on rapid clicks
    if (now - lastWatchClickRef.current < 300) {
      return;
    }
    lastWatchClickRef.current = now;
    setPlayerAnime(anime);
    setPlayerEpisode(episode || null);
    setPlayerModalOpen(true);
  };

  const handleWatchlistChange = () => {
    setWatchlistCount(getWatchlist().length);
  };

  const handleProviderChanged = (provider: ApiProviderConfig) => {
    setActiveProvider(provider);
    loadInitialData();
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-rose-600 selection:text-white relative box-border">
      {/* MAINTENANCE OVERLAY (If Enabled in Super Admin) */}
      <MaintenanceOverlay onUnlock={() => setAdminModalOpen(true)} />

      {/* Top Navbar */}
      <Navbar
        activeView={activeView}
        onNavigate={(view) => {
          setActiveView(view);
          if (view === 'genres' && !selectedGenre && genresList.length > 0) {
            handleSelectGenre(genresList[0]);
          }
        }}
        onSelectGenre={handleSelectGenre}
        genres={genresList}
        onSelectAnime={handleOpenAnimeDetails}
        onOpenApiModal={() => setApiModalOpen(true)}
        onOpenAdminModal={handleOpenAdmin}
        onOpenVipModal={handleOpenVip}
        onOpenProfileModal={handleOpenProfile}
        onOpenSearchModal={() => setSearchModalOpen(true)}
        activeProvider={activeProvider}
        watchlistCount={watchlistCount}
        isAdmin={isAdmin}
      />

      {/* PWA INSTALL / OFFLINE BANNER */}
      <PwaInstallBanner onOpenVip={handleOpenVip} />

      {/* Main View Area */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        {/* VIEW 1: HOME DASHBOARD */}
        {activeView === 'home' && (
          <div className="space-y-4 sm:space-y-6 animate-fadeIn">
            {/* Hero Banner Spotlight */}
            <HeroBanner
              spotlights={spotlights}
              onSelectAnime={handleOpenAnimeDetails}
              onWatchTrailer={handleWatchTrailer}
              onWatchlistChanged={handleWatchlistChange}
            />

            {/* SECTION 1: Trending on Anime-X */}
            <section className="max-w-7xl mx-auto px-2.5 xs:px-3.5 sm:px-6 lg:px-8 space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                  <div className="p-1 sm:p-1.5 bg-rose-600/20 text-rose-500 rounded-lg shrink-0">
                    <Flame className="w-3.5 h-3.5 sm:w-5 sm:h-5 fill-current" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm xs:text-base sm:text-xl font-extrabold text-white tracking-tight truncate">
                      Trending & Most Watched
                    </h2>
                    <p className="text-[10px] sm:text-xs text-neutral-400 truncate">
                      Top ranking titles on your backend server
                    </p>
                  </div>
                </div>

                <button
                  id="view-all-airing-btn"
                  onClick={() => setActiveView('airing')}
                  className="text-[11px] sm:text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-0.5 sm:gap-1 cursor-pointer shrink-0"
                >
                  <span>View All ({trendingAnime.length})</span>
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {isLoading && trendingAnime.length === 0 ? (
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 xs:gap-2.5 sm:gap-3 lg:gap-4 animate-pulse">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-[3/4] bg-neutral-900 rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 xs:gap-2.5 sm:gap-3 lg:gap-4 w-full min-w-0">
                  {trendingAnime.slice(0, 12).map((anime) => (
                    <AnimeCard
                      key={anime.id || anime.slug}
                      anime={anime}
                      onClick={handleOpenAnimeDetails}
                      onWatchTrailer={handleWatchTrailer}
                      onWatchlistChanged={handleWatchlistChange}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* SECTION 2: Top Rated Masterpieces */}
            <section className="max-w-7xl mx-auto px-2.5 xs:px-3.5 sm:px-6 lg:px-8 space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                  <div className="p-1 sm:p-1.5 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
                    <Award className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm xs:text-base sm:text-xl font-extrabold text-white tracking-tight truncate">
                      Highest Rated Anime
                    </h2>
                    <p className="text-[10px] sm:text-xs text-neutral-400 truncate">
                      Top score catalog sorted by user reviews
                    </p>
                  </div>
                </div>

                <button
                  id="view-all-top-btn"
                  onClick={() => setActiveView('top')}
                  className="text-[11px] sm:text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-0.5 sm:gap-1 cursor-pointer shrink-0"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 xs:gap-2.5 sm:gap-3 lg:gap-4 w-full min-w-0">
                {topRanked.slice(0, 12).map((anime) => (
                  <AnimeCard
                    key={anime.id || anime.slug}
                    anime={anime}
                    onClick={handleOpenAnimeDetails}
                    onWatchTrailer={handleWatchTrailer}
                    onWatchlistChanged={handleWatchlistChange}
                  />
                ))}
              </div>
            </section>

            {/* DYNAMIC FEED AD BANNER */}
            <div className="max-w-7xl mx-auto px-2.5 xs:px-3.5 sm:px-6 lg:px-8">
              <AdBanner
                placement="feed"
                onOpenVipModal={() => setVipModalOpen(true)}
              />
            </div>

            {/* SECTION 3: Full Anime Catalog */}
            <section
              id="full-anime-catalog-section"
              ref={catalogSectionRef}
              className="max-w-7xl mx-auto px-2.5 xs:px-3.5 sm:px-6 lg:px-8 space-y-3 sm:space-y-4 scroll-mt-16"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                  <div className="p-1 sm:p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg shrink-0">
                    <TrendingUp className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm xs:text-base sm:text-xl font-extrabold text-white tracking-tight truncate">
                      Full Anime Catalog ({homeCatalog.length} Titles)
                    </h2>
                    <p className="text-[10px] sm:text-xs text-neutral-400 truncate">
                      Indexed directly from your backend data sources • Page {catalogPage} of {totalCatalogPages}
                    </p>
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={`catalog-grid-page-${catalogPage}`}
                  variants={genreGridContainerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 xs:gap-2.5 sm:gap-3 lg:gap-4 w-full min-w-0"
                >
                  {currentCatalogItems.map((anime) => (
                    <motion.div
                      key={anime.id || anime.slug}
                      variants={genreCardItemVariants}
                      className="w-full h-full flex flex-col"
                    >
                      <AnimeCard
                        anime={anime}
                        onClick={handleOpenAnimeDetails}
                        onWatchTrailer={handleWatchTrailer}
                        onWatchlistChanged={handleWatchlistChange}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>

              {/* Functional Pagination Section directly ABOVE 'Explore by Genre' */}
              <Pagination
                id="catalog-pagination-bar"
                currentPage={catalogPage}
                totalPages={totalCatalogPages}
                totalItems={homeCatalog.length}
                itemsPerPage={CATALOG_ITEMS_PER_PAGE}
                onPageChange={handleCatalogPageChange}
              />
            </section>

            {/* SECTION 4: Browse By Genre */}
            {genresList.length > 0 && (
              <section className="max-w-7xl mx-auto px-2.5 xs:px-3.5 sm:px-6 lg:px-8 space-y-2 sm:space-y-3 pb-2 sm:pb-4">
                <div className="flex items-center gap-1.5 sm:gap-2.5">
                  <div className="p-1 sm:p-1.5 bg-rose-500/20 text-rose-400 rounded-lg shrink-0">
                    <Layers className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm xs:text-base sm:text-xl font-extrabold text-white tracking-tight">
                      Explore by Genre
                    </h2>
                    <p className="text-[10px] sm:text-xs text-neutral-400">
                      Find anime tailored to your favorite categories
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5 sm:gap-2 w-full min-w-0">
                  {genresList.map((genre) => (
                    <div
                      key={genre.mal_id || genre.name}
                      onClick={() => handleSelectGenre(genre)}
                      className="p-2 sm:p-2.5 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 hover:border-rose-500/50 rounded-xl cursor-pointer transition-all text-center group active:scale-95"
                    >
                      <h4 className="text-[11px] sm:text-xs font-bold text-neutral-200 group-hover:text-rose-400 transition-colors truncate">
                        {genre.name}
                      </h4>
                      {genre.count && (
                        <p className="text-[9px] sm:text-[10px] text-neutral-500 mt-0.5">
                          {genre.count} Titles
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* VIEW 2: TRENDING & AIRING ANIME */}
        {activeView === 'airing' && (
          <div className="max-w-7xl mx-auto px-2.5 xs:px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-3 sm:space-y-4 animate-fadeIn w-full max-w-full overflow-hidden">
            <div className="border-b border-neutral-800 pb-3 sm:pb-4 flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2 sm:gap-2.5">
                  <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500 fill-current" />
                  Trending Anime
                </h1>
                <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5">
                  All active series with streaming servers and HD playback.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 xs:gap-2.5 sm:gap-3 lg:gap-4 w-full min-w-0">
              {trendingAnime.map((anime) => (
                <AnimeCard
                  key={anime.id || anime.slug}
                  anime={anime}
                  onClick={handleOpenAnimeDetails}
                  onWatchTrailer={handleWatchTrailer}
                  onWatchlistChanged={handleWatchlistChange}
                />
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: TOP RANKED ALL TIME */}
        {activeView === 'top' && (
          <div className="max-w-7xl mx-auto px-2.5 xs:px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-3 sm:space-y-4 animate-fadeIn w-full max-w-full overflow-hidden">
            <div className="border-b border-neutral-800 pb-3 sm:pb-4">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2 sm:gap-2.5">
                <Award className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                Top Rated Anime
              </h1>
              <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5">
                Highest rated anime sorted by score.
              </p>
            </div>

            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 xs:gap-2.5 sm:gap-3 lg:gap-4 w-full min-w-0">
              {topRanked.map((anime) => (
                <AnimeCard
                  key={anime.id || anime.slug}
                  anime={anime}
                  onClick={handleOpenAnimeDetails}
                  onWatchTrailer={handleWatchTrailer}
                  onWatchlistChanged={handleWatchlistChange}
                />
              ))}
            </div>
          </div>
        )}

        {/* VIEW 4: WEEKLY SCHEDULE */}
        {activeView === 'schedule' && (
          <ScheduleView
            onSelectAnime={handleOpenAnimeDetails}
            onWatchTrailer={handleWatchTrailer}
          />
        )}

        {/* VIEW 5: MY WATCHLIST */}
        {activeView === 'watchlist' && (
          <WatchlistView
            onSelectAnime={handleOpenAnimeDetails}
            onWatchTrailer={handleWatchTrailer}
          />
        )}

        {/* VIEW 6: GENRES EXPLORER */}
        {activeView === 'genres' && (
          <div className="max-w-7xl mx-auto px-2.5 xs:px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-3 sm:space-y-4 animate-fadeIn w-full max-w-full overflow-hidden">
            <div className="border-b border-neutral-800 pb-3 sm:pb-4">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2 sm:gap-2.5">
                <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500" />
                Explore Genres: {selectedGenre?.name || 'All'}
              </h1>
              <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5">
                Select any genre pill to filter the anime library.
              </p>
            </div>

            {/* Genre Pills */}
            <div className="flex flex-wrap gap-1 sm:gap-1.5">
              {genresList.map((g) => (
                <button
                  key={g.mal_id || g.name}
                  onClick={() => handleSelectGenre(g)}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedGenre?.mal_id === g.mal_id
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>

            {/* Anime in selected Genre */}
            {isLoading ? (
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 xs:gap-2.5 sm:gap-3 lg:gap-4 animate-pulse w-full">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] bg-neutral-900 rounded-xl" />
                ))}
              </div>
            ) : genreAnimeList.length === 0 ? (
              <div className="py-12 sm:py-16 text-center text-neutral-500 bg-neutral-900/40 rounded-2xl border border-neutral-800 p-6">
                No anime found for this genre.
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`genre-grid-${selectedGenre?.mal_id || selectedGenre?.name || 'all'}`}
                  variants={genreGridContainerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 xs:gap-2.5 sm:gap-3 lg:gap-4 w-full min-w-0"
                >
                  {genreAnimeList.map((anime) => (
                    <motion.div
                      key={anime.id || anime.slug}
                      variants={genreCardItemVariants}
                      className="w-full h-full flex flex-col"
                    >
                      <AnimeCard
                        anime={anime}
                        onClick={handleOpenAnimeDetails}
                        onWatchTrailer={handleWatchTrailer}
                        onWatchlistChanged={handleWatchlistChange}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <Footer
        onOpenVipModal={handleOpenVip}
      />

      {/* DETAIL MODAL */}
      <AnimeDetailModal
        animeId={selectedAnimeId}
        initialAnime={selectedAnimeForDetails}
        onClose={() => {
          setSelectedAnimeId(null);
          setSelectedAnimeForDetails(null);
          if (window.location.pathname.startsWith('/anime/')) {
            window.history.pushState(null, '', '/');
          }
        }}
        onWatchTrailer={handleWatchTrailer}
        onSelectAnime={handleOpenAnimeDetails}
        onWatchlistChanged={handleWatchlistChange}
      />

      {/* DEDICATED FULL-SCREEN SEARCH OVERLAY MODAL */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelectAnime={(anime) => {
          setSearchModalOpen(false);
          handleOpenAnimeDetails(anime);
        }}
        onWatchTrailer={(anime, ep) => {
          setSearchModalOpen(false);
          handleWatchTrailer(anime, ep);
        }}
        onWatchlistChanged={handleWatchlistChange}
      />

      {/* VIDEO PLAYER MODAL WITH LAZY LOADING & INSTANT SKELETON */}
      {playerModalOpen && (
        <React.Suspense
          fallback={
            <PlayerSkeletonModal
              anime={playerAnime}
              onClose={() => {
                setPlayerModalOpen(false);
                setPlayerAnime(null);
                setPlayerEpisode(null);
              }}
            />
          }
        >
          <VideoPlayerModal
            isOpen={playerModalOpen}
            onClose={() => {
              setPlayerModalOpen(false);
              setPlayerAnime(null);
              setPlayerEpisode(null);
            }}
            anime={playerAnime}
            selectedEpisode={playerEpisode}
            onSelectEpisode={(ep) => setPlayerEpisode(ep)}
          />
        </React.Suspense>
      )}

      {/* API CONFIGURATION & CUSTOM ENDPOINT MODAL */}
      <ApiSettingsModal
        isOpen={apiModalOpen}
        onClose={() => setApiModalOpen(false)}
        onProviderChanged={handleProviderChanged}
      />

      {/* BACKEND ADMIN PANEL MODAL */}
      <AdminModal
        isOpen={adminModalOpen}
        onClose={handleCloseAdmin}
        onCatalogSynced={() => loadInitialData()}
      />

      {/* VIP PASS & AD-FREE UPGRADE MODAL */}
      <VipUpgradeModal
        isOpen={vipModalOpen}
        onClose={handleCloseVip}
      />

      {/* USER PROFILE & ACCOUNT DASHBOARD MODAL */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={handleCloseProfile}
        user={userProfile}
        plans={getVipPlans()}
        onOpenVipModal={handleOpenVip}
        onOpenAdminModal={isAdmin ? handleOpenAdmin : undefined}
        onNavigateWatchlist={() => setActiveView('watchlist')}
        isAdmin={isAdmin}
      />
    </div>
  );
}
