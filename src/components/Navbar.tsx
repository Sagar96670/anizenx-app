import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  Search,
  Bookmark,
  Calendar,
  Layers,
  Server,
  X,
  Menu,
  Sparkles,
  ChevronDown,
  ShieldAlert,
  Command,
  Crown,
  Zap,
} from 'lucide-react';
import { AnimeItem, AnimeGenre, ApiProviderConfig } from '../types/anime';
import { 
  isVipActive, 
  subscribeToVip, 
  getVipProfile, 
  loginWithGoogle, 
  logoutUser 
} from '../services/vipStore';
import {
  isMembershipSystemEnabled,
  subscribeToAdminState
} from '../services/adminStore';
import { VipUser } from '../types/admin';

interface NavbarProps {
  activeView: 'home' | 'top' | 'airing' | 'schedule' | 'watchlist' | 'genres';
  onNavigate: (view: 'home' | 'top' | 'airing' | 'schedule' | 'watchlist' | 'genres') => void;
  onSelectGenre?: (genre: AnimeGenre) => void;
  genres: AnimeGenre[];
  onSelectAnime: (anime: AnimeItem) => void;
  onOpenApiModal?: () => void;
  onOpenAdminModal?: () => void;
  onOpenVipModal?: () => void;
  onOpenSearchModal: (initialQuery?: string) => void;
  activeProvider?: ApiProviderConfig;
  watchlistCount: number;
  isAdmin?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onNavigate,
  onSelectGenre,
  genres,
  onOpenApiModal,
  onOpenAdminModal,
  onOpenVipModal,
  onOpenSearchModal,
  activeProvider,
  watchlistCount,
  isAdmin = false,
}) => {
  const [showGenresMenu, setShowGenresMenu] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [vipActive, setVipActive] = useState<boolean>(isVipActive());
  const [vipPlanName, setVipPlanName] = useState<string>(getVipProfile().planName || '');
  const [userProfile, setUserProfile] = useState<VipUser | null>(getVipProfile());
  const [membershipEnabled, setMembershipEnabled] = useState<boolean>(isMembershipSystemEnabled());

  useEffect(() => {
    const unsubVip = subscribeToVip((u) => {
      setVipActive(u.isVip);
      setVipPlanName(u.planName || '');
      setUserProfile(u);
    });
    const unsubAdmin = subscribeToAdminState((s) => {
      setMembershipEnabled(s.isMembershipSystemEnabled ?? true);
    });
    return () => {
      unsubVip();
      unsubAdmin();
    };
  }, []);

  const genresMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Click outside listener for genres menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        genresMenuRef.current &&
        !genresMenuRef.current.contains(e.target as Node)
      ) {
        setShowGenresMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Click outside listener for profile menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global keyboard shortcut: Ctrl+K or Cmd+K or "/" to open search overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'k' && (e.metaKey || e.ctrlKey)) ||
        (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')
      ) {
        e.preventDefault();
        onOpenSearchModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSearchModal]);

  const isLoggedIn = !!(userProfile && userProfile.email && !userProfile.userId.startsWith('guest_'));

  return (
    <nav className="sticky top-0 z-40 w-full max-w-full bg-neutral-950/90 backdrop-blur-xl border-b border-neutral-800/80 box-border overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 box-border">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-1.5 sm:gap-4 w-full max-w-full box-border">
          {/* Logo & Brand */}
          <div
            onClick={() => onNavigate('home')}
            className="flex items-center gap-1.5 sm:gap-2.5 cursor-pointer group shrink-0 min-w-0"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-600/30 group-hover:scale-105 transition-transform shrink-0">
              <Flame className="w-4 h-4 sm:w-6 sm:h-6 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm sm:text-lg font-black tracking-tight text-white group-hover:text-rose-400 transition-colors truncate">
                  ANIME<span className="text-rose-500">STREAM</span>
                </span>
              </div>
              <span className="text-[8px] sm:text-[10px] text-neutral-400 font-mono block -mt-0.5 sm:-mt-1 tracking-wider uppercase truncate">
                Anime-X Live
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-1">
            <button
              id="nav-home-btn"
              onClick={() => onNavigate('home')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeView === 'home'
                  ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
              }`}
            >
              Home
            </button>

            <button
              id="nav-airing-btn"
              onClick={() => onNavigate('airing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeView === 'airing'
                  ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
              }`}
            >
              🔥 Trending
            </button>

            <button
              id="nav-top-btn"
              onClick={() => onNavigate('top')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeView === 'top'
                  ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
              }`}
            >
              🏆 Top Rated
            </button>

            <button
              id="nav-schedule-btn"
              onClick={() => onNavigate('schedule')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeView === 'schedule'
                  ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
              }`}
            >
              📅 Schedule
            </button>

            {/* Genres Dropdown */}
            <div ref={genresMenuRef} className="relative">
              <button
                id="nav-genres-dropdown-btn"
                onClick={() => setShowGenresMenu(!showGenresMenu)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  activeView === 'genres' || showGenresMenu
                    ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <span>🎭 Genres</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showGenresMenu && (
                <div className="absolute top-full left-0 mt-2 w-72 p-3 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl z-50 grid grid-cols-2 gap-1.5 animate-fadeIn">
                  {genres.slice(0, 16).map((g) => (
                    <button
                      key={g.mal_id || g.name}
                      onClick={() => {
                        if (onSelectGenre) onSelectGenre(g);
                        setShowGenresMenu(false);
                      }}
                      className="px-2.5 py-1.5 text-left text-xs font-medium text-neutral-300 hover:text-rose-300 hover:bg-neutral-800 rounded-lg transition-colors truncate cursor-pointer"
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Search Trigger Bar -> Opens Dedicated Search Overlay */}
          <div className="hidden md:flex flex-1 max-w-sm lg:max-w-md">
            <button
              id="global-anime-search-trigger-btn"
              onClick={() => onOpenSearchModal()}
              className="w-full flex items-center justify-between px-3.5 py-2 bg-neutral-900/90 hover:bg-neutral-850 border border-neutral-800 hover:border-rose-500/50 rounded-xl text-xs text-neutral-400 hover:text-neutral-200 transition-all cursor-pointer group shadow-sm"
              title="Open Search Overlay (Ctrl+K)"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Search className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform shrink-0" />
                <span className="truncate">Search 240+ titles (Solo Leveling, Liar Game...)...</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono text-neutral-500 bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800 group-hover:border-neutral-700 shrink-0">
                <Command className="w-2.5 h-2.5" />
                <span>K</span>
              </div>
            </button>
          </div>

          {/* Right Action Icons & Auth / Profile */}
          <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 shrink-0">
            {/* Mobile / Compact Search Icon Button */}
            <button
              id="nav-search-icon-btn"
              onClick={() => onOpenSearchModal()}
              className="md:hidden p-1.5 xs:p-2 sm:p-2.5 rounded-xl border bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:text-rose-400 hover:bg-neutral-800 transition-all cursor-pointer shrink-0"
              title="Search Anime"
            >
              <Search className="w-4 h-4 text-rose-500" />
            </button>

            {/* Watchlist Quick Link */}
            <button
              id="nav-watchlist-btn"
              onClick={() => onNavigate('watchlist')}
              className={`relative p-1.5 xs:p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                activeView === 'watchlist'
                  ? 'bg-rose-600/20 border-rose-500/40 text-rose-400'
                  : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800'
              }`}
              title="My Watchlist"
            >
              <Bookmark className="w-4 h-4" />
              {watchlistCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {watchlistCount}
                </span>
              )}
            </button>

            {/* Clean GO VIP Button */}
            {membershipEnabled && onOpenVipModal && (
              <button
                id="nav-vip-upgrade-btn"
                onClick={onOpenVipModal}
                className={`hidden xs:flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shrink-0 ${
                  vipActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 border border-amber-500/50 text-amber-300 shadow-amber-500/10'
                    : 'bg-gradient-to-r from-amber-500/10 hover:from-amber-500/20 to-rose-500/10 hover:to-rose-500/20 border border-amber-500/40 text-amber-300 hover:text-amber-200'
                }`}
                title={vipActive ? 'VIP Active - 4K Ad-Free Streaming' : 'Go VIP - Ad-Free, 4K Streaming & Offline'}
              >
                <Crown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${vipActive ? 'text-amber-400 fill-amber-400' : 'text-amber-400'}`} />
                <span className="font-mono text-[11px] sm:text-xs">
                  {vipActive ? (vipPlanName ? vipPlanName.toUpperCase() : 'VIP ACTIVE') : 'GO VIP'}
                </span>
              </button>
            )}

            {/* Desktop Auth / User Dropdown */}
            <div className="hidden sm:block shrink-0">
              {isLoggedIn && userProfile ? (
                <div ref={profileMenuRef} className="relative">
                  <button
                    id="nav-user-profile-dropdown-trigger"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center gap-2 p-1 sm:p-1.5 pr-2.5 sm:pr-3 hover:bg-neutral-900 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer group"
                  >
                    <div className={`relative w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border ${
                      membershipEnabled && vipActive ? 'border-amber-500 shadow-sm shadow-amber-500/20' : 'border-neutral-700'
                    }`}>
                      {userProfile.photoURL ? (
                        <img
                          src={userProfile.photoURL}
                          alt={userProfile.userName || 'Profile'}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-neutral-800 to-neutral-700 text-white font-black text-xs flex items-center justify-center uppercase">
                          {(userProfile.userName || 'U')[0]}
                        </div>
                      )}
                      {membershipEnabled && vipActive && (
                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center border border-neutral-950">
                          <Crown className="w-2 h-2 text-neutral-950 fill-neutral-950" />
                        </div>
                      )}
                    </div>
                    <div className="text-left hidden md:block">
                      <div className="text-xs font-bold text-white leading-none truncate max-w-[100px] group-hover:text-rose-400 transition-colors">
                        {userProfile.userName || 'User'}
                      </div>
                      <div className="text-[9px] text-neutral-400 leading-none mt-0.5 font-mono">
                        {membershipEnabled ? (vipActive ? 'VIP MEMBER' : 'FREE MEMBER') : 'MEMBER'}
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-colors" />
                  </button>

                  {showProfileMenu && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-4 z-50 flex flex-col gap-3.5 animate-fadeIn">
                      <div className="flex items-center gap-3 pb-3 border-b border-neutral-800/60">
                        <div className={`w-10 h-10 rounded-xl overflow-hidden shrink-0 border ${
                          membershipEnabled && vipActive ? 'border-amber-500' : 'border-neutral-700'
                        }`}>
                          {userProfile.photoURL ? (
                            <img src={userProfile.photoURL} referrerPolicy="no-referrer" alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-neutral-800 text-white font-black text-sm flex items-center justify-center">
                              {(userProfile.userName || 'U')[0]}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate leading-tight">{userProfile.userName}</div>
                          <div className="text-[11px] text-neutral-400 truncate leading-tight mt-0.5">{userProfile.email}</div>
                        </div>
                      </div>

                      {/* Subscription Status Pill */}
                      {membershipEnabled && (
                        <div className={`p-3 rounded-xl flex items-center justify-between border ${
                          vipActive
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 animate-pulse'
                            : 'bg-neutral-950 border-neutral-850 text-neutral-400'
                        }`}>
                          <div className="flex items-center gap-2">
                            <Crown className={`w-4 h-4 ${vipActive ? 'text-amber-400 fill-amber-400/20' : 'text-neutral-500'}`} />
                            <div className="text-left">
                              <div className="text-[10px] uppercase font-mono tracking-wider font-bold">Subscription</div>
                              <div className="text-xs font-black">{vipActive ? (vipPlanName.toUpperCase() || 'VIP MEMBER') : 'FREE MEMBER'}</div>
                            </div>
                          </div>
                          {!vipActive && onOpenVipModal && (
                            <button
                              onClick={() => {
                                setShowProfileMenu(false);
                                onOpenVipModal();
                              }}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-extrabold text-[10px] rounded-lg cursor-pointer transition-colors"
                            >
                              UPGRADE
                            </button>
                          )}
                        </div>
                      )}

                      {/* Super Admin Control Panel Trigger (Strict Email Restricted) */}
                      {isAdmin && onOpenAdminModal && (
                        <button
                          id="dropdown-admin-panel-btn"
                          onClick={() => {
                            setShowProfileMenu(false);
                            onOpenAdminModal();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30 hover:border-rose-500/50 text-rose-300 hover:text-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <Command className="w-4 h-4 text-rose-500 shrink-0" />
                          <span>Admin Control Panel</span>
                        </button>
                      )}

                      <button
                        id="dropdown-logout-btn"
                        onClick={async () => {
                          setShowProfileMenu(false);
                          await logoutUser();
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-850 rounded-xl text-xs font-bold transition-colors cursor-pointer mt-1"
                      >
                        <span>Logout Account</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  id="header-sign-in-btn"
                  onClick={async () => {
                    try {
                      await loginWithGoogle();
                    } catch (e: any) {
                      if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
                        console.error('Google login trigger failed:', e);
                      }
                    }
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 text-white transition-all cursor-pointer shadow-sm"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>Sign In</span>
                </button>
              )}
            </div>

            {/* Mobile menu toggle button */}
            <button
              id="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 xs:p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-900 cursor-pointer shrink-0 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-neutral-800 grid grid-cols-2 gap-2 animate-fadeIn w-full max-w-full box-border overflow-hidden">
            <button
              onClick={() => {
                onOpenSearchModal();
                setMobileMenuOpen(false);
              }}
              className="col-span-2 px-3 py-2 bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-bold rounded-lg text-left cursor-pointer flex items-center gap-2"
            >
              <Search className="w-4 h-4 text-rose-400" />
              <span>🔍 Search 240+ Anime Titles...</span>
            </button>

            {/* VIP Mobile Button */}
            {membershipEnabled && onOpenVipModal && (
              <button
                onClick={() => {
                  onOpenVipModal();
                  setMobileMenuOpen(false);
                }}
                className={`col-span-2 px-3 py-2 text-xs font-bold rounded-lg text-left cursor-pointer flex items-center justify-between border ${
                  vipActive
                    ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                    : 'bg-gradient-to-r from-amber-950/40 to-rose-950/40 border-amber-500/40 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400 fill-amber-400/40" />
                  <span>{vipActive ? `👑 VIP Active (${vipPlanName})` : '👑 Upgrade to VIP'}</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded font-bold">
                  {vipActive ? 'ACTIVE' : 'NO ADS'}
                </span>
              </button>
            )}

            {/* Mobile Auth and Super Admin (Strict Email Restricted) */}
            {isLoggedIn && userProfile ? (
              <>
                <div className="col-span-2 flex items-center gap-3 p-3 bg-neutral-900/50 border border-neutral-800 rounded-xl">
                  <div className={`w-9 h-9 rounded-lg overflow-hidden shrink-0 border ${
                    membershipEnabled && vipActive ? 'border-amber-500' : 'border-neutral-700'
                  }`}>
                    {userProfile.photoURL ? (
                      <img src={userProfile.photoURL} referrerPolicy="no-referrer" alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-neutral-800 text-white font-black text-xs flex items-center justify-center uppercase">
                        {(userProfile.userName || 'U')[0]}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate leading-tight">{userProfile.userName}</div>
                    <div className="text-[10px] text-neutral-400 truncate leading-tight mt-0.5">{userProfile.email}</div>
                    <div className="text-[9px] uppercase font-mono text-amber-500 font-bold mt-1">
                      {membershipEnabled ? (vipActive ? `👑 ${vipPlanName}` : 'FREE MEMBER') : 'MEMBER'}
                    </div>
                  </div>
                </div>

                {isAdmin && onOpenAdminModal && (
                  <button
                    onClick={() => {
                      if (onOpenAdminModal) onOpenAdminModal();
                      setMobileMenuOpen(false);
                    }}
                    className="col-span-2 px-3 py-2 bg-rose-600/10 border border-rose-500/30 text-rose-300 text-xs font-bold rounded-lg text-left cursor-pointer flex items-center gap-2"
                  >
                    <Command className="w-4 h-4 text-rose-500" />
                    <span>Admin Control Panel</span>
                  </button>
                )}

                <button
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await logoutUser();
                  }}
                  className="col-span-2 px-3 py-2 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 text-xs font-bold rounded-lg text-center cursor-pointer"
                >
                  Logout Account
                </button>
              </>
            ) : (
              <button
                onClick={async () => {
                  setMobileMenuOpen(false);
                  try {
                    await loginWithGoogle();
                  } catch (e: any) {
                    if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
                      console.error('Google Sign-In Mobile failed:', e);
                    }
                  }
                }}
                className="col-span-2 px-3 py-2 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-white text-xs font-bold rounded-lg text-center cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}

            <button
              onClick={() => {
                onNavigate('home');
                setMobileMenuOpen(false);
              }}
              className="px-3 py-2 bg-neutral-900 text-xs font-bold text-neutral-200 rounded-lg text-left cursor-pointer"
            >
              🏠 Home
            </button>
            <button
              onClick={() => {
                onNavigate('airing');
                setMobileMenuOpen(false);
              }}
              className="px-3 py-2 bg-neutral-900 text-xs font-bold text-neutral-200 rounded-lg text-left cursor-pointer"
            >
              🔥 Trending
            </button>
            <button
              onClick={() => {
                onNavigate('top');
                setMobileMenuOpen(false);
              }}
              className="px-3 py-2 bg-neutral-900 text-xs font-bold text-neutral-200 rounded-lg text-left cursor-pointer"
            >
              🏆 Top Rated
            </button>
            <button
              onClick={() => {
                onNavigate('schedule');
                setMobileMenuOpen(false);
              }}
              className="px-3 py-2 bg-neutral-900 text-xs font-bold text-neutral-200 rounded-lg text-left cursor-pointer"
            >
              📅 Schedule
            </button>
            <button
              onClick={() => {
                onNavigate('watchlist');
                setMobileMenuOpen(false);
              }}
              className="col-span-2 px-3 py-2 bg-neutral-900 text-xs font-bold text-neutral-200 rounded-lg text-left cursor-pointer"
            >
              🔖 Watchlist ({watchlistCount})
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
