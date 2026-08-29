import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  X,
  Lock,
  RefreshCw,
  Send,
  Radio,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Database,
  Eye,
  Flame,
  KeyRound,
  FileCode,
  Sparkles,
  Crown,
  Tv,
  Layers,
  Upload,
  Plus,
  Trash2,
  Edit3,
  Sliders,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Video,
  Play,
  Film,
  Server,
  Activity,
  BarChart3,
  ExternalLink,
  Shield,
  HelpCircle,
  FileVideo,
  Search,
  Gift,
  Clock,
} from 'lucide-react';
import { AnimeItem, AnimeEpisode, AnimeGenre } from '../types/anime';
import { VipPlan } from '../types/admin';
import {
  getAdminState,
  subscribeToAdminState,
  verifyAdminPasscode,
  isAdminAuthenticated,
  adminSignOut,
  setAdminPasscode,
  getAdminPasscode,
  isGlobalPaywallActive,
  setGlobalPaywall,
  isMembershipSystemEnabled,
  setMembershipSystemEnabled,
  getAdEngineSettings,
  updateAdEngineSettings,
  getServerConfig,
  updateServerConfig,
  toggleMaintenanceMode,
  setServerStatus,
  getAnimeOverride,
  setAnimeOverride,
  deleteAnimeOverride,
  hideEpisode,
  unhideEpisode,
  lockEpisode,
  getCustomAnimeList,
  addOrUpdateCustomAnime,
  deleteCustomAnime,
  uploadAndAttachEpisodeVideo,
} from '../services/adminStore';
import {
  getVipPlans,
  saveVipPlans,
  subscribeToPlans,
  getVipUser,
  activateVipMembership,
  getPaymentSettings,
  savePaymentSettings,
  getVipRequests,
  approveVipRequest,
  rejectVipRequest,
} from '../services/vipStore';
import {
  getHomeAnime,
  adminSyncCatalog,
  getAdminDashboard,
} from '../services/animeApi';
import { BACKEND_BASE_URL } from '../services/apiConfig';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCatalogSynced?: () => void;
}

type AdminTab = 'overview' | 'content' | 'subscriptions' | 'ads' | 'servers';

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  onCatalogSynced,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(isAdminAuthenticated());
  const [passcode, setPasscode] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [subTab, setSubTab] = useState<'plans' | 'gateway' | 'pending'>('plans');
  const [paymentSettings, setPaymentSettingsState] = useState<any>({
    phonePeQrUrl: '',
    upiId: '',
    merchantId: '',
    bankAccount: '',
    ifscCode: '',
    accountHolder: '',
  });
  const [vipRequests, setVipRequestsState] = useState<any[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState<boolean>(false);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  // Admin Store State
  const [adminState, setAdminState] = useState(getAdminState());
  const [vipPlans, setVipPlans] = useState<VipPlan[]>(getVipPlans());

  // Catalog for Content Manager
  const [catalog, setCatalog] = useState<AnimeItem[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<AnimeItem | null>(null);
  const [searchCatalogQuery, setSearchCatalogQuery] = useState<string>('');
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(false);

  // Upload video state
  const [uploadingEpisodeNumber, setUploadingEpisodeNumber] = useState<number>(1);
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New/Edit Anime Form
  const [isEditingAnimeModal, setIsEditingAnimeModal] = useState<boolean>(false);
  const [editingAnimeForm, setEditingAnimeForm] = useState<Partial<AnimeItem>>({});

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Change Passcode State
  const [newPasscode, setNewPasscode] = useState<string>('');
  const [passcodeChangedMsg, setPasscodeChangedMsg] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const unsubAdmin = subscribeToAdminState((st) => setAdminState(st));
    const unsubPlans = subscribeToPlans((pl) => setVipPlans(pl));
    return () => {
      unsubAdmin();
      unsubPlans();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsAuthenticated(isAdminAuthenticated());
      loadCatalog();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === 'subscriptions') {
      loadPaymentSettings();
      loadVipRequests();
    }
  }, [isOpen, activeTab]);

  const loadPaymentSettings = async () => {
    const settings = await getPaymentSettings();
    setPaymentSettingsState(settings);
  };

  const loadVipRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const requests = await getVipRequests();
      setVipRequestsState(requests);
    } catch (err) {
      console.error('Failed to load VIP requests:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await savePaymentSettings(paymentSettings);
      showToast('⚡ Payment Settings Successfully Saved!');
    } catch (err) {
      showToast('❌ Failed to save settings: ' + String(err));
    }
  };

  const handleApproveRequest = async (request: any) => {
    try {
      showToast('⏳ Approving subscription for ' + request.userName);
      await approveVipRequest(request);
      showToast('✅ VIP Subscription Approved & Activated!');
      loadVipRequests();
    } catch (err) {
      showToast('❌ Error approving request: ' + String(err));
    }
  };

  const handleRejectRequest = async (request: any) => {
    const reason = rejectReasons[request.id] || 'Payment verification failed';
    try {
      showToast('⏳ Rejecting transaction ' + request.transactionId);
      await rejectVipRequest(request, reason);
      showToast('❌ VIP Request Rejected');
      loadVipRequests();
    } catch (err) {
      showToast('❌ Error rejecting request: ' + String(err));
    }
  };

  const loadCatalog = async () => {
    setIsLoadingCatalog(true);
    try {
      const res = await getHomeAnime();
      const custom = getCustomAnimeList();
      const combined = [...custom, ...(res.data || [])];
      setCatalog(combined);
      if (combined.length > 0 && !selectedAnime) {
        setSelectedAnime(combined[0]);
      }
    } catch (e) {
      console.warn('Failed to load anime catalog for admin:', e);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPasscode(passcode)) {
      setIsAuthenticated(true);
      setLoginError('');
      setPasscode('');
      showToast('⚡ God-Mode Admin Access Granted!');
    } else {
      setLoginError('Invalid Passcode. Default is 1234.');
    }
  };

  const handleLogout = () => {
    adminSignOut();
    setIsAuthenticated(false);
    showToast('Logged out of Admin Panel');
  };

  const handleSavePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPasscode.length < 4) {
      setPasscodeChangedMsg('Passcode must be at least 4 digits');
      return;
    }
    if (setAdminPasscode(newPasscode)) {
      setPasscodeChangedMsg('✅ Passcode successfully updated to ' + newPasscode);
      setNewPasscode('');
      showToast('Admin Passcode Updated');
    }
  };

  if (!isOpen) return null;

  // Render Login Lock Screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fadeIn">
        <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8 text-neutral-100">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center space-y-3 mb-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-rose-600/30">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black tracking-tight text-white">
              AnizenX Super Admin Gateway
            </h3>
            <p className="text-xs text-neutral-400">
              Enter master security passcode to access God-Mode controls
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="Enter Passcode (Default: 1234)"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-700 focus:border-rose-500 rounded-xl text-sm text-white focus:outline-none font-mono"
                />
              </div>
              {loginError && (
                <p className="text-xs text-rose-400 font-semibold mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{loginError}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-black tracking-wide shadow-lg shadow-rose-600/30 transition-all cursor-pointer hover:scale-[1.02]"
            >
              Unlock God-Mode Dashboard
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-neutral-900 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
            <span>Passcode: 1234</span>
            <span>Security: Active</span>
          </div>
        </div>
      </div>
    );
  }

  // Filter catalog
  const filteredCatalog = catalog.filter((a) =>
    (a.title + (a.titleEnglish || '') + (a.slug || '')).toLowerCase().includes(searchCatalogQuery.toLowerCase())
  );

  const activeOverride = selectedAnime ? getAnimeOverride(selectedAnime.slug || selectedAnime.id) : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/95 backdrop-blur-2xl animate-fadeIn overflow-hidden">
      <div className="relative w-full max-w-6xl h-[94vh] bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-100 flex flex-col">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-neutral-800/80 bg-neutral-900/90 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-600/20">
              <Flame className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                  AnizenX Ultra Admin & Ad Engine
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[10px] font-mono font-bold">
                  GOD-MODE
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                Manage Content, Direct Video Uploads, VIP Paywall, Dynamic Ads, and Server Health
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {toastMessage && (
              <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-lg animate-fadeIn flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{toastMessage}</span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Lock Admin Panel"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="px-4 py-2 border-b border-neutral-800/80 bg-neutral-950 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Overview & Stats</span>
          </button>

          <button
            onClick={() => setActiveTab('content')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'content'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Content & Episodes CRUD</span>
          </button>

          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'subscriptions'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>VIP Paywall & Plans</span>
          </button>

          <button
            onClick={() => setActiveTab('ads')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ads'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Dynamic Ad Engine</span>
          </button>

          <button
            onClick={() => setActiveTab('servers')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'servers'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Server & Maintenance</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: SYSTEM OVERVIEW & METRICS */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Live Backend Status & Admin Catalog Sync Banner */}
              <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">Live Backend Connection</h4>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          ONLINE
                        </span>
                      </div>
                      <p className="text-xs font-mono text-neutral-400 mt-0.5">
                        API Endpoint: <span className="text-rose-400 font-semibold">{BACKEND_BASE_URL}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          showToast('⏳ Syncing Anime-X Catalog...');
                          await adminSyncCatalog();
                          await loadCatalog();
                          if (onCatalogSynced) onCatalogSynced();
                          showToast('✅ Anime-X Catalog Successfully Synced!');
                        } catch (err) {
                          showToast('❌ Catalog Sync Failed: ' + String(err));
                        }
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-rose-600/30 active:scale-95"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Admin Catalog Sync</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-neutral-800/80 text-[11px] font-mono text-neutral-400">
                  <div>Active Catalog: <span className="text-white font-bold">{catalog.length} Titles</span></div>
                  <div>Cache Mode: <span className="text-emerald-400 font-bold">In-Memory + Local DB</span></div>
                  <div>Live Microservices: <span className="text-amber-400 font-bold">TMDb + AniList Proxy</span></div>
                </div>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1">
                  <div className="flex items-center justify-between text-neutral-400 text-xs">
                    <span>Streams Today</span>
                    <Play className="w-4 h-4 text-rose-500" />
                  </div>
                  <p className="text-2xl font-black text-white">
                    {adminState.metrics.totalStreamsToday.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-mono">↑ 18.4% vs yesterday</p>
                </div>

                <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1">
                  <div className="flex items-center justify-between text-neutral-400 text-xs">
                    <span>Active VIP Members</span>
                    <Crown className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-2xl font-black text-amber-400">
                    {adminState.metrics.activeVipMembers.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-mono">100% Ad-Free Subscribers</p>
                </div>

                <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1">
                  <div className="flex items-center justify-between text-neutral-400 text-xs">
                    <span>Ad Impressions</span>
                    <Tv className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-2xl font-black text-white">
                    {adminState.metrics.totalAdImpressions.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-neutral-400 font-mono">Prerolls + Banners served</p>
                </div>

                <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1">
                  <div className="flex items-center justify-between text-neutral-400 text-xs">
                    <span>Est. Monthly Revenue</span>
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-black text-emerald-400">
                    ₹{adminState.metrics.monthlyRevenueInr.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-mono">VIP Subscriptions + Ads</p>
                </div>
              </div>

              {/* Master Control Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Master VIP Feature Toggle Switch */}
                <div className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
                  adminState.isMembershipSystemEnabled !== false
                    ? 'bg-gradient-to-b from-amber-950/30 to-neutral-900/90 border-amber-500/40 shadow-lg shadow-amber-950/20'
                    : 'bg-neutral-900/60 border-neutral-800 opacity-90'
                }`}>
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>VIP Membership System</span>
                      </h4>
                      <button
                        onClick={() => {
                          const next = adminState.isMembershipSystemEnabled === false ? true : false;
                          setMembershipSystemEnabled(next);
                          showToast(next ? 'VIP Membership System ENABLED (VIP Buttons & Badges Visible)' : 'VIP Membership System DISABLED (All Content Free, VIP Hidden)');
                        }}
                        className={`text-2xl transition-colors cursor-pointer ${
                          adminState.isMembershipSystemEnabled !== false ? 'text-amber-400' : 'text-neutral-600'
                        }`}
                        title={adminState.isMembershipSystemEnabled !== false ? 'Click to Disable VIP Membership Globally' : 'Click to Enable VIP Membership Globally'}
                      >
                        {adminState.isMembershipSystemEnabled !== false ? (
                          <ToggleRight className="w-8 h-8 text-amber-400" />
                        ) : (
                          <ToggleLeft className="w-8 h-8" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-neutral-400 mt-2">
                      Master feature flag. When OFF: hides all VIP upgrade buttons, modals, pricing plans, and VIP badges site-wide, and allows 100% free streaming.
                    </p>
                  </div>

                  <div className="text-[11px] font-mono p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300">
                    Master State:{' '}
                    <strong className={adminState.isMembershipSystemEnabled !== false ? 'text-amber-400' : 'text-rose-400'}>
                      {adminState.isMembershipSystemEnabled !== false ? 'ENABLED (ACTIVE SYSTEM)' : 'DISABLED (ALL FREE & HIDDEN)'}
                    </strong>
                  </div>
                </div>

                {/* Global Paywall Switch */}
                <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-400" />
                        <span>Master VIP Paywall</span>
                      </h4>
                      <button
                        onClick={() => {
                          const next = !adminState.globalPaywallEnabled;
                          setGlobalPaywall(next);
                          showToast(next ? 'Paywall Activated Globally' : 'Paywall Disabled (All Content Free)');
                        }}
                        className={`text-2xl transition-colors cursor-pointer ${
                          adminState.globalPaywallEnabled ? 'text-amber-400' : 'text-neutral-600'
                        }`}
                      >
                        {adminState.globalPaywallEnabled ? (
                          <ToggleRight className="w-8 h-8" />
                        ) : (
                          <ToggleLeft className="w-8 h-8" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-neutral-400 mt-2">
                      When enabled, episodes marked as locked or above free thresholds require active VIP.
                    </p>
                  </div>

                  <div className="text-[11px] font-mono p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300">
                    Status:{' '}
                    <strong className={adminState.globalPaywallEnabled ? 'text-amber-400' : 'text-neutral-500'}>
                      {adminState.globalPaywallEnabled ? 'ACTIVE (ENFORCING VIP)' : 'DISABLED (OPEN ACCESS)'}
                    </strong>
                  </div>
                </div>

                {/* Master Ad Engine Switch */}
                <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Tv className="w-4 h-4 text-purple-400" />
                        <span>Dynamic Ad Engine</span>
                      </h4>
                      <button
                        onClick={() => {
                          const next = !adminState.ads.masterAdsEnabled;
                          updateAdEngineSettings({ masterAdsEnabled: next });
                          showToast(next ? 'Ad Engine Enabled for Free Users' : 'Ads Disabled Site-wide');
                        }}
                        className={`text-2xl transition-colors cursor-pointer ${
                          adminState.ads.masterAdsEnabled ? 'text-purple-400' : 'text-neutral-600'
                        }`}
                      >
                        {adminState.ads.masterAdsEnabled ? (
                          <ToggleRight className="w-8 h-8" />
                        ) : (
                          <ToggleLeft className="w-8 h-8" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-neutral-400 mt-2">
                      Serves Preroll countdown ads & banner placements to non-VIP free users.
                    </p>
                  </div>

                  <div className="text-[11px] font-mono p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300">
                    VIP Auto-Bypass:{' '}
                    <strong className="text-emerald-400">100% STRIPPED FOR VIP SUBSCRIBERS</strong>
                  </div>
                </div>

                {/* Site Maintenance Mode Switch */}
                <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                        <span>Site Maintenance Mode</span>
                      </h4>
                      <button
                        onClick={() => {
                          const next = !adminState.servers.maintenanceMode;
                          toggleMaintenanceMode(next);
                          showToast(next ? 'Site Maintenance ON' : 'Site Restored Online');
                        }}
                        className={`text-2xl transition-colors cursor-pointer ${
                          adminState.servers.maintenanceMode ? 'text-rose-500' : 'text-neutral-600'
                        }`}
                      >
                        {adminState.servers.maintenanceMode ? (
                          <ToggleRight className="w-8 h-8" />
                        ) : (
                          <ToggleLeft className="w-8 h-8" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-neutral-400 mt-2">
                      Shows a Cyberpunk maintenance overlay to public users while allowing admins to bypass.
                    </p>
                  </div>

                  <div className="text-[11px] font-mono p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300">
                    Current Mode:{' '}
                    <strong className={adminState.servers.maintenanceMode ? 'text-rose-400' : 'text-emerald-400'}>
                      {adminState.servers.maintenanceMode ? 'MAINTENANCE SHIELD UP' : 'LIVE & HEALTHY'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-3">
                <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Quick Operations
                </h4>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={() => setActiveTab('content')}
                    className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-rose-400" />
                    <span>Upload Local Video from Phone/PC</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('subscriptions')}
                    className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>Edit VIP Plans & Pricing</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('ads')}
                    className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Tv className="w-4 h-4 text-purple-400" />
                    <span>Configure Preroll Video Ad</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTENT & GRANULAR EPISODE MANAGEMENT */}
          {activeTab === 'content' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                {/* Search in Catalog */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search 240+ anime by title or slug..."
                    value={searchCatalogQuery}
                    onChange={(e) => setSearchCatalogQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-800 focus:border-rose-500 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>

                {/* Add Custom Title Button */}
                <button
                  onClick={() => {
                    setEditingAnimeForm({
                      id: 'custom_' + Date.now(),
                      title: 'New Anime Title',
                      titleJapanese: '',
                      episodes: 12,
                      seasons: 1,
                      score: 8.5,
                      images: {
                        jpg: {
                          imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
                        },
                      },
                      genres: [{ name: 'Action' }, { name: 'Adventure' }],
                    });
                    setIsEditingAnimeModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Anime Title</span>
                </button>
              </div>

              {/* Master-Detail Split Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Anime List Selector */}
                <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-2 max-h-[600px] overflow-y-auto">
                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                    Select Anime ({filteredCatalog.length})
                  </div>
                  {filteredCatalog.slice(0, 50).map((anime) => {
                    const isSelected = selectedAnime?.id === anime.id || selectedAnime?.slug === anime.slug;
                    const override = getAnimeOverride(anime.slug || anime.id);

                    return (
                      <div
                        key={anime.id || anime.slug}
                        onClick={() => setSelectedAnime(anime)}
                        className={`p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-rose-950/40 border-rose-500 text-white'
                            : 'bg-neutral-950 border-neutral-850 hover:border-neutral-700 text-neutral-300'
                        }`}
                      >
                        <div className="w-10 h-14 rounded-lg overflow-hidden shrink-0 bg-neutral-900 border border-neutral-800">
                          <img
                            src={anime.images?.jpg?.imageUrl}
                            alt={anime.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold truncate">{anime.title}</h5>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-1 font-mono">
                            <span>Score: {override?.ratingOverride ?? anime.score ?? 8.5}</span>
                            <span>•</span>
                            <span>Eps: {anime.episodes || 12}</span>
                          </div>
                          {override?.customBadges && override.customBadges.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {override.customBadges.map((b) => (
                                <span
                                  key={b}
                                  className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px] font-bold"
                                >
                                  {b}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right: Granular Controls for Selected Anime */}
                {selectedAnime ? (
                  <div className="lg:col-span-2 p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-6">
                    {/* Header with Title and Preview */}
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-800">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-20 rounded-xl overflow-hidden shrink-0 bg-neutral-950 border border-neutral-700 shadow-md">
                          <img
                            src={selectedAnime.images?.jpg?.imageUrl}
                            alt={selectedAnime.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="text-base font-black text-white">{selectedAnime.title}</h4>
                          <p className="text-xs text-neutral-400 font-mono">
                            Slug: {selectedAnime.slug || selectedAnime.id}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px] font-mono">
                              Total Episodes: {selectedAnime.episodes || 12}
                            </span>
                            {activeOverride?.isPremiumOnly && (
                              <span className="px-2 py-0.5 rounded bg-amber-500 text-black text-[10px] font-extrabold flex items-center gap-1">
                                <Crown className="w-3 h-3" />
                                <span>PREMIUM ONLY</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setEditingAnimeForm(selectedAnime);
                          setIsEditingAnimeModal(true);
                        }}
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Info</span>
                      </button>
                    </div>

                    {/* Section 1: Manual Overrides (Rating, Views, Badges, Pinning, VIP Lock) */}
                    <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-4">
                      <h5 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-rose-500" />
                        <span>Instant Manual Overrides</span>
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Rating Override */}
                        <div>
                          <label className="block text-xs font-semibold text-neutral-400 mb-1">
                            Rating Override (0.0 – 10.0):
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            placeholder={String(selectedAnime.score || 8.5)}
                            value={activeOverride?.ratingOverride ?? ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setAnimeOverride(selectedAnime.slug || selectedAnime.id, {
                                ratingOverride: isNaN(val) ? undefined : val,
                              });
                            }}
                            className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white"
                          />
                        </div>

                        {/* View Count Override */}
                        <div>
                          <label className="block text-xs font-semibold text-neutral-400 mb-1">
                            View Count Override:
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 500000"
                            value={activeOverride?.viewsOverride ?? ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setAnimeOverride(selectedAnime.slug || selectedAnime.id, {
                                viewsOverride: isNaN(val) ? undefined : val,
                              });
                            }}
                            className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white"
                          />
                        </div>
                      </div>

                      {/* Custom Badges Selector */}
                      <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                          Custom Badges:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {['HOT', 'FULL DUB', '4K ULTRA', 'EXCLUSIVE', 'TRENDING', 'RAW'].map((badge) => {
                            const hasBadge = activeOverride?.customBadges?.includes(badge);
                            return (
                              <button
                                key={badge}
                                type="button"
                                onClick={() => {
                                  const current = new Set(activeOverride?.customBadges || []);
                                  if (hasBadge) {
                                    current.delete(badge);
                                  } else {
                                    current.add(badge);
                                  }
                                  setAnimeOverride(selectedAnime.slug || selectedAnime.id, {
                                    customBadges: Array.from(current),
                                  });
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  hasBadge
                                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                                }`}
                              >
                                {badge}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Carousel Pinning & VIP Locks */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-900">
                        <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!activeOverride?.pinnedToHero}
                            onChange={(e) => {
                              setAnimeOverride(selectedAnime.slug || selectedAnime.id, {
                                pinnedToHero: e.target.checked,
                              });
                              showToast(e.target.checked ? 'Pinned to Hero Carousel' : 'Unpinned');
                            }}
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                          />
                          <span>Pin to Hero Spotlight Carousel</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs text-amber-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!activeOverride?.isPremiumOnly}
                            onChange={(e) => {
                              setAnimeOverride(selectedAnime.slug || selectedAnime.id, {
                                isPremiumOnly: e.target.checked,
                              });
                              showToast(e.target.checked ? 'Anime Set to VIP ONLY' : 'Anime unlocked for all');
                            }}
                            className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                          />
                          <span>Lock Entire Anime (VIP Only)</span>
                        </label>
                      </div>
                    </div>

                    {/* Section 2: Mobile Storage Video File Upload (Auto Stream Attachment) */}
                    <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                          <Upload className="w-4 h-4 text-emerald-400" />
                          <span>Mobile & Storage Direct Video Upload</span>
                        </h5>
                        <span className="text-[10px] font-mono text-neutral-500">
                          Auto-attaches stream URL to Episode
                        </span>
                      </div>

                      <div className="p-4 rounded-xl border-2 border-dashed border-neutral-750 hover:border-emerald-500/50 bg-neutral-900/50 text-center space-y-3 transition-colors">
                        <div className="flex items-center justify-center gap-3">
                          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
                            <span>Target Episode:</span>
                            <input
                              type="number"
                              min="1"
                              max={selectedAnime.episodes || 100}
                              value={uploadingEpisodeNumber}
                              onChange={(e) => setUploadingEpisodeNumber(parseInt(e.target.value) || 1)}
                              className="w-16 px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-center text-white"
                            />
                          </div>
                        </div>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setIsUploadingFile(true);
                            setUploadStatus(`Uploading "${file.name}"...`);

                            const res = await uploadAndAttachEpisodeVideo(
                              selectedAnime.slug || selectedAnime.id,
                              uploadingEpisodeNumber,
                              file
                            );

                            setIsUploadingFile(false);
                            setUploadStatus(res.message);
                            if (res.success) {
                              showToast(`Uploaded video to Ep ${uploadingEpisodeNumber}!`);
                            }
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingFile}
                          className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 cursor-pointer inline-flex items-center gap-2"
                        >
                          <FileVideo className="w-4 h-4" />
                          <span>Choose Video File from Device</span>
                        </button>

                        <p className="text-[11px] text-neutral-400">
                          Supports MP4, MKV, WebM directly from phone camera roll, files, or PC storage
                        </p>

                        {uploadStatus && (
                          <p className="text-xs font-mono text-emerald-400 font-semibold mt-1">
                            {uploadStatus}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Section 3: Granular Episode List (Hide / Lock / Delete) */}
                    <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                          <Layers className="w-4 h-4 text-rose-500" />
                          <span>Episode Lock & Visibility Controls</span>
                        </h5>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-neutral-400">Free Threshold:</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 3 (Ep 4+ VIP)"
                            value={activeOverride?.freeEpisodesThreshold ?? ''}
                            onChange={(e) => {
                              const num = parseInt(e.target.value);
                              setAnimeOverride(selectedAnime.slug || selectedAnime.id, {
                                freeEpisodesThreshold: isNaN(num) ? undefined : num,
                              });
                            }}
                            className="w-20 px-2 py-0.5 bg-neutral-900 border border-neutral-700 rounded text-center text-xs text-amber-400 font-bold"
                          />
                        </div>
                      </div>

                      {/* Episode Badges Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                        {Array.from({ length: selectedAnime.episodes || 12 }, (_, i) => i + 1).map((epNum) => {
                          const isHidden = activeOverride?.hiddenEpisodeNumbers?.includes(epNum);
                          const isLocked =
                            activeOverride?.lockedEpisodeNumbers?.includes(epNum) ||
                            (activeOverride?.freeEpisodesThreshold !== undefined &&
                              epNum > activeOverride.freeEpisodesThreshold);

                          return (
                            <div
                              key={epNum}
                              className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-1.5 ${
                                isHidden
                                  ? 'bg-rose-950/20 border-rose-900/40 opacity-50'
                                  : isLocked
                                  ? 'bg-amber-950/20 border-amber-900/40'
                                  : 'bg-neutral-900 border-neutral-800'
                              }`}
                            >
                              <span className="font-mono font-bold text-white">EP {epNum}</span>

                              <div className="flex items-center gap-1">
                                {/* Lock Toggle */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    lockEpisode(selectedAnime.slug || selectedAnime.id, epNum, !isLocked);
                                  }}
                                  className={`p-1 rounded hover:bg-neutral-800 cursor-pointer ${
                                    isLocked ? 'text-amber-400' : 'text-neutral-500'
                                  }`}
                                  title={isLocked ? 'Locked (VIP Only)' : 'Unlocked'}
                                >
                                  <Lock className="w-3 h-3" />
                                </button>

                                {/* Hide Toggle */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isHidden) {
                                      unhideEpisode(selectedAnime.slug || selectedAnime.id, epNum);
                                      showToast(`Restored Episode ${epNum}`);
                                    } else {
                                      hideEpisode(selectedAnime.slug || selectedAnime.id, epNum);
                                      showToast(`Hidden Episode ${epNum}`);
                                    }
                                  }}
                                  className={`p-1 rounded hover:bg-neutral-800 cursor-pointer ${
                                    isHidden ? 'text-rose-500' : 'text-neutral-500'
                                  }`}
                                  title={isHidden ? 'Hidden' : 'Visible'}
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="lg:col-span-2 p-12 text-center text-neutral-500 rounded-2xl bg-neutral-900/40 border border-neutral-800">
                    Select an anime from the left catalog to manage overrides and uploads.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: VIP SUBSCRIPTION & PAYWALL SYSTEM */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header Info Section */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-amber-950/40 border border-neutral-800">
                <div>
                  <h4 className="text-base font-black text-white flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-400" />
                    <span>Master VIP Subscription & Payment Manager</span>
                  </h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Manage multi-currency plans, PhonePe gateway settings, manual scan & submit verification UTR approvals
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-bold text-neutral-300">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>VIP System:</span>
                    </span>
                    <button
                      onClick={() => {
                        const next = adminState.isMembershipSystemEnabled === false ? true : false;
                        setMembershipSystemEnabled(next);
                        showToast(next ? 'VIP System Enabled Globally' : 'VIP System Disabled Globally');
                      }}
                      className={`text-2xl cursor-pointer transition-colors ${
                        adminState.isMembershipSystemEnabled !== false ? 'text-amber-400' : 'text-neutral-600'
                      }`}
                      title={adminState.isMembershipSystemEnabled !== false ? 'Click to Disable VIP System' : 'Click to Enable VIP System'}
                    >
                      {adminState.isMembershipSystemEnabled !== false ? (
                        <ToggleRight className="w-7 h-7 text-amber-400" />
                      ) : (
                        <ToggleLeft className="w-7 h-7" />
                      )}
                    </button>
                    <span className={`text-[10px] font-mono font-bold ${
                      adminState.isMembershipSystemEnabled !== false ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {adminState.isMembershipSystemEnabled !== false ? 'ON' : 'OFF'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
                    <span>Paywall:</span>
                    <button
                      onClick={() => {
                        const next = !adminState.globalPaywallEnabled;
                        setGlobalPaywall(next);
                        showToast(next ? 'VIP Hard Paywall Enabled' : 'VIP Hard Paywall Disabled');
                      }}
                      className={`text-2xl cursor-pointer ${
                        adminState.globalPaywallEnabled ? 'text-amber-400' : 'text-neutral-600'
                      }`}
                    >
                      {adminState.globalPaywallEnabled ? (
                        <ToggleRight className="w-8 h-8" />
                      ) : (
                        <ToggleLeft className="w-8 h-8" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sub-Tabs Nav */}
              <div className="flex border-b border-neutral-800 gap-4">
                <button
                  onClick={() => setSubTab('plans')}
                  className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                    subTab === 'plans'
                      ? 'border-amber-500 text-amber-400 font-extrabold'
                      : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  Subscription Plans ({vipPlans.length})
                </button>
                <button
                  onClick={() => setSubTab('gateway')}
                  className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                    subTab === 'gateway'
                      ? 'border-amber-500 text-amber-400 font-extrabold'
                      : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  Admin Payment Settings
                </button>
                <button
                  onClick={() => setSubTab('pending')}
                  className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    subTab === 'pending'
                      ? 'border-amber-500 text-amber-400 font-extrabold'
                      : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  <span>Gateway & Webhook Activity</span>
                  {vipRequests.filter(r => r.status === 'pending').length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-bold font-mono">
                      {vipRequests.filter(r => r.status === 'pending').length}
                    </span>
                  )}
                </button>
              </div>

              {/* Sub-Tab 1: PLANS CRUD */}
              {subTab === 'plans' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {vipPlans.map((plan, index) => (
                      <div
                        key={plan.id}
                        className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-4 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <input
                              type="text"
                              value={plan.name}
                              onChange={(e) => {
                                const updated = [...vipPlans];
                                updated[index].name = e.target.value;
                                saveVipPlans(updated);
                              }}
                              className="bg-transparent border-b border-neutral-700 text-sm font-bold text-white focus:outline-none focus:border-amber-500 w-full"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-neutral-400">Price (INR ₹):</label>
                              <input
                                type="number"
                                value={plan.priceInr}
                                onChange={(e) => {
                                  const updated = [...vipPlans];
                                  updated[index].priceInr = parseInt(e.target.value) || 0;
                                  saveVipPlans(updated);
                                }}
                                className="w-full px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-neutral-400">Price (USD $):</label>
                              <input
                                type="number"
                                step="0.01"
                                value={plan.priceUsd}
                                onChange={(e) => {
                                  const updated = [...vipPlans];
                                  updated[index].priceUsd = parseFloat(e.target.value) || 0;
                                  saveVipPlans(updated);
                                }}
                                className="w-full px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-xs text-white"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] text-neutral-400">Duration Text:</label>
                            <input
                              type="text"
                              value={plan.duration}
                              onChange={(e) => {
                                const updated = [...vipPlans];
                                updated[index].duration = e.target.value;
                                saveVipPlans(updated);
                              }}
                              className="w-full px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-xs text-white"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-neutral-400">Badge Text:</label>
                            <input
                              type="text"
                              value={plan.badge || ''}
                              placeholder="e.g. MOST POPULAR"
                              onChange={(e) => {
                                const updated = [...vipPlans];
                                updated[index].badge = e.target.value;
                                saveVipPlans(updated);
                              }}
                              className="w-full px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-xs text-amber-400 font-bold"
                            />
                          </div>
                        </div>

                        <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
                          <span className="text-emerald-400 font-mono text-[10px]">Active in Store</span>
                          <button
                            onClick={() => {
                              const updated = vipPlans.filter((_, i) => i !== index);
                              saveVipPlans(updated);
                              showToast('Deleted plan');
                            }}
                            className="text-rose-500 hover:text-rose-400 p-1 cursor-pointer"
                            title="Delete Plan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      const newP: VipPlan = {
                        id: 'plan_custom_' + Date.now(),
                        name: 'VIP Special Pass',
                        priceInr: 499,
                        priceUsd: 5.99,
                        duration: '6 Months',
                        durationDays: 180,
                        features: ['100% Zero Ads', 'Full Series Unlocked', 'Fast Server Alpha'],
                        active: true,
                        color: 'cyan',
                      };
                      saveVipPlans([...vipPlans, newP]);
                      showToast('New VIP Plan Created!');
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-amber-400" />
                    <span>Add New Subscription Plan</span>
                  </button>
                </div>
              )}

              {/* Sub-Tab 2: ADMIN PAYMENT SETTINGS (GATEWAYS) */}
              {subTab === 'gateway' && (
                <form onSubmit={handleSavePaymentSettings} className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-6 max-w-2xl">
                  <div className="space-y-1">
                    <h5 className="text-sm font-black text-white">Dynamic Payment Details Setup</h5>
                    <p className="text-[11px] text-neutral-400">
                      These details are dynamically loaded instantly when user launches the scan/UPI payment modal.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* UPI ID */}
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                        Active UPI ID:
                      </label>
                      <input
                        type="text"
                        value={paymentSettings.upiId || ''}
                        onChange={(e) => setPaymentSettingsState({ ...paymentSettings, upiId: e.target.value })}
                        required
                        placeholder="e.g. pay@phonepe"
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Merchant ID */}
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                        PhonePe Merchant ID:
                      </label>
                      <input
                        type="text"
                        value={paymentSettings.merchantId || ''}
                        onChange={(e) => setPaymentSettingsState({ ...paymentSettings, merchantId: e.target.value })}
                        required
                        placeholder="e.g. MID9201385"
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-neutral-950/60 border border-neutral-850 rounded-xl space-y-4">
                    <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider block">
                      Bank Settlement Accounts
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-1">Account Holder Name:</label>
                        <input
                          type="text"
                          value={paymentSettings.accountHolder || ''}
                          onChange={(e) => setPaymentSettingsState({ ...paymentSettings, accountHolder: e.target.value })}
                          required
                          placeholder="e.g. ANIZENX NETWORKS"
                          className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-1">Account Number:</label>
                        <input
                          type="text"
                          value={paymentSettings.bankAccount || ''}
                          onChange={(e) => setPaymentSettingsState({ ...paymentSettings, bankAccount: e.target.value })}
                          required
                          placeholder="e.g. 918020038475"
                          className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-1">IFSC Code:</label>
                        <input
                          type="text"
                          value={paymentSettings.ifscCode || ''}
                          onChange={(e) => setPaymentSettingsState({ ...paymentSettings, ifscCode: e.target.value })}
                          required
                          placeholder="e.g. UTIB0000001"
                          className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-neutral-800 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-black font-black text-xs shadow-lg transition-all cursor-pointer"
                    >
                      Save Settings Configuration
                    </button>
                  </div>
                </form>
              )}

              {/* Sub-Tab 3: PHONEPE PG & GATEWAY TRANSACTIONS */}
              {subTab === 'pending' && (
                <div className="space-y-4">
                  <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
                    <h5 className="text-sm font-black text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black text-xs">Pe</span>
                      <span>PhonePe PG & Webhook Automated Transactions</span>
                    </h5>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Monitors all real-time PhonePe Merchant Gateway intents and incoming PAYMENT_SUCCESS webhook callbacks. Automatic VIP state is provisioned to Firestore upon confirmed callback.
                    </p>
                  </div>

                  {isLoadingRequests ? (
                    <div className="py-12 text-center text-neutral-500 animate-pulse text-xs">
                      Loading VIP manual transaction requests...
                    </div>
                  ) : vipRequests.length === 0 ? (
                    <div className="py-12 text-center text-neutral-500 rounded-xl bg-neutral-900/40 border border-neutral-800 text-xs">
                      No pending or processed manual requests found.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {vipRequests.map((req) => (
                        <div
                          key={req.id}
                          className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                            req.status === 'approved'
                              ? 'bg-emerald-950/10 border-emerald-900/40'
                              : req.status === 'rejected'
                              ? 'bg-rose-950/10 border-rose-900/40'
                              : 'bg-neutral-900 border-neutral-800'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row items-start gap-4 flex-1">
                            {/* Receipt Proof Expandable Thumbnail */}
                            {req.proofImageUrl ? (
                              <a
                                href={req.proofImageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-24 h-24 bg-neutral-950 border border-neutral-700 rounded-lg overflow-hidden shrink-0 block relative group"
                                title="Click to view full size image proof in new tab"
                              >
                                <img
                                  src={req.proofImageUrl}
                                  alt="Payment Receipt"
                                  className="w-full h-full object-cover transition-all group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all text-[9px] text-white font-bold uppercase">
                                  View Proof
                                </div>
                              </a>
                            ) : (
                              <div className="w-24 h-24 bg-neutral-950 border border-neutral-800 rounded-lg flex items-center justify-center text-[10px] text-neutral-500 shrink-0">
                                No Screenshot
                              </div>
                            )}

                            <div className="space-y-1.5 text-left flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-white">{req.userName}</span>
                                <span className="text-[10px] text-neutral-400 font-mono">({req.email})</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  req.status === 'approved'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : req.status === 'rejected'
                                    ? 'bg-rose-500/20 text-rose-400'
                                    : 'bg-amber-500/20 text-amber-400'
                                }`}>
                                  {req.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11px] font-mono">
                                <div>
                                  <span className="text-neutral-500">Plan:</span>{' '}
                                  <span className="text-amber-400 font-bold">{req.planName}</span>
                                </div>
                                <div>
                                  <span className="text-neutral-500">Price:</span>{' '}
                                  <span className="text-white">₹{req.priceInr}</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-neutral-500">Transaction ID/UTR:</span>{' '}
                                  <span className="text-rose-400 font-black tracking-wider bg-rose-950/20 px-1 py-0.5 rounded border border-rose-900/30">
                                    {req.transactionId}
                                  </span>
                                </div>
                              </div>

                              <p className="text-[10px] text-neutral-500 font-mono">
                                Request Date: {new Date(req.createdAt).toLocaleString()}
                              </p>

                              {req.rejectReason && (
                                <p className="text-xs text-rose-400 font-semibold italic">
                                  Rejection Reason: {req.rejectReason}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Approval Rejection Controls */}
                          {req.status === 'pending' && (
                            <div className="space-y-2 w-full md:w-auto shrink-0 md:text-right">
                              <input
                                type="text"
                                placeholder="Reason if rejecting..."
                                value={rejectReasons[req.id] || ''}
                                onChange={(e) => setRejectReasons({ ...rejectReasons, [req.id]: e.target.value })}
                                className="w-full md:w-48 px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-xs text-white focus:outline-none"
                              />
                              <div className="flex items-center md:justify-end gap-2">
                                <button
                                  onClick={() => handleRejectRequest(req)}
                                  className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 border border-rose-600/30 hover:border-rose-600/60 rounded-lg text-xs font-bold cursor-pointer"
                                >
                                  Reject Request
                                </button>
                                <button
                                  onClick={() => handleApproveRequest(req)}
                                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                                >
                                  Approve & Activate
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DYNAMIC AD ENGINE */}
          {activeTab === 'ads' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-black text-white flex items-center gap-2">
                    <Tv className="w-5 h-5 text-purple-400" />
                    <span>Dynamic Multi-Placement Ad Engine</span>
                  </h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Control Prerolls, Countdown Timers, Banner Placements, and Anti-Adblock Wrapping
                  </p>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                  <Shield className="w-4 h-4" />
                  <span>VIP Ad-Free Bypass: Guaranteed 100%</span>
                </div>
              </div>

              {/* 0. Rewarded Ad Gate Master Configuration & Cooldown Timer */}
              <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Rewarded Ad Gate (In-Player Monetization)</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                          (adminState.ads.rewardedAd?.enabled ?? true)
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                        }`}>
                          {(adminState.ads.rewardedAd?.enabled ?? true) ? 'Gate Active' : 'Gate Disabled'}
                        </span>
                      </h5>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Forces free users to watch a short sponsor/network ad to unlock HD stream playback with anti-abuse cooldowns.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-400 hidden sm:inline">
                      Enable Rewarded Ad Gate:
                    </span>
                    <button
                      id="admin-toggle-rewarded-ad"
                      onClick={() => {
                        const currentVal = adminState.ads.rewardedAd?.enabled ?? true;
                        updateAdEngineSettings({
                          rewardedAd: {
                            ...(adminState.ads.rewardedAd || {
                              enabled: true,
                              adNetworkUrl: 'https://discord.gg/anizenx',
                              cooldownMinutes: 30,
                            }),
                            enabled: !currentVal,
                          },
                        });
                        showToast(!currentVal ? 'Rewarded Ad Gate Enabled' : 'Rewarded Ad Gate Disabled');
                      }}
                      className={`text-2xl cursor-pointer transition-colors ${
                        (adminState.ads.rewardedAd?.enabled ?? true) ? 'text-red-500' : 'text-neutral-600'
                      }`}
                    >
                      {(adminState.ads.rewardedAd?.enabled ?? true) ? (
                        <ToggleRight className="w-8 h-8" />
                      ) : (
                        <ToggleLeft className="w-8 h-8" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-800/80">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Rewarded Ad Network URL:
                    </label>
                    <input
                      id="admin-rewarded-ad-url-input"
                      type="text"
                      placeholder="https://direct.adnetwork.com/... or sponsor link"
                      value={adminState.ads.rewardedAd?.adNetworkUrl || ''}
                      onChange={(e) =>
                        updateAdEngineSettings({
                          rewardedAd: {
                            ...(adminState.ads.rewardedAd || {
                              enabled: true,
                              adNetworkUrl: 'https://discord.gg/anizenx',
                              cooldownMinutes: 30,
                            }),
                            adNetworkUrl: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white font-mono focus:border-red-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-neutral-500 mt-1">
                      Dynamic sponsor URL or ad network link opened in a new tab upon clicking "Watch Ad".
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ad Cooldown Timer (Duration in Minutes):</span>
                    </label>
                    <input
                      id="admin-rewarded-ad-cooldown-input"
                      type="number"
                      min="1"
                      max="1440"
                      value={adminState.ads.rewardedAd?.cooldownMinutes ?? 30}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        updateAdEngineSettings({
                          rewardedAd: {
                            ...(adminState.ads.rewardedAd || {
                              enabled: true,
                              adNetworkUrl: 'https://discord.gg/anizenx',
                              cooldownMinutes: 30,
                            }),
                            cooldownMinutes: isNaN(val) || val < 1 ? 30 : val,
                          },
                        });
                      }}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white font-mono focus:border-red-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-neutral-500 mt-1">
                      Server Switch & Episode Cooldown: Once unlocked, user won't see any ads across Server 1, 2, 3, or 4 for this duration.
                    </p>
                  </div>
                </div>
              </div>

              {/* 1. Preroll Video Ad Configuration */}
              <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-bold text-white flex items-center gap-2">
                    <Play className="w-4 h-4 text-rose-500" />
                    <span>In-Player Preroll Video Ad (Plays Before Video)</span>
                  </h5>

                  <button
                    onClick={() => {
                      updateAdEngineSettings({
                        preroll: {
                          ...adminState.ads.preroll,
                          enabled: !adminState.ads.preroll.enabled,
                        },
                      });
                      showToast(adminState.ads.preroll.enabled ? 'Preroll Ads Disabled' : 'Preroll Ads Enabled');
                    }}
                    className={`text-2xl cursor-pointer ${
                      adminState.ads.preroll.enabled ? 'text-rose-500' : 'text-neutral-600'
                    }`}
                  >
                    {adminState.ads.preroll.enabled ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1">
                      Ad Title / Headline:
                    </label>
                    <input
                      type="text"
                      value={adminState.ads.preroll.title}
                      onChange={(e) =>
                        updateAdEngineSettings({
                          preroll: { ...adminState.ads.preroll, title: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1">
                      Sponsor Label:
                    </label>
                    <input
                      type="text"
                      value={adminState.ads.preroll.sponsorName}
                      onChange={(e) =>
                        updateAdEngineSettings({
                          preroll: { ...adminState.ads.preroll, sponsorName: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1 flex items-center justify-between">
                      <span>Media Video URL (MP4 / WebM or VAST XML Tag):</span>
                      <span className="text-[10px] text-amber-400 font-mono font-normal">Auto-parses VAST XML</span>
                    </label>
                    <input
                      type="text"
                      placeholder="https://vapid-size.com/... or https://.../ad.mp4"
                      value={adminState.ads.preroll.mediaUrl}
                      onChange={(e) =>
                        updateAdEngineSettings({
                          preroll: { ...adminState.ads.preroll, mediaUrl: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white font-mono focus:border-rose-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-neutral-500 mt-1">
                      Supports direct MP4 video files or VAST 2.0/3.0/4.0 XML endpoints (e.g. vapid-size.com). The player will extract the MediaFile automatically.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1">
                      Destination / CTA Link:
                    </label>
                    <input
                      type="text"
                      value={adminState.ads.preroll.ctaLink}
                      onChange={(e) =>
                        updateAdEngineSettings({
                          preroll: { ...adminState.ads.preroll, ctaLink: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1">
                      Skip Delay Countdown (Seconds):
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={adminState.ads.preroll.skipDelaySec}
                      onChange={(e) =>
                        updateAdEngineSettings({
                          preroll: {
                            ...adminState.ads.preroll,
                            skipDelaySec: parseInt(e.target.value) || 5,
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1">
                      Total Duration (Seconds):
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={adminState.ads.preroll.durationSec}
                      onChange={(e) =>
                        updateAdEngineSettings({
                          preroll: {
                            ...adminState.ads.preroll,
                            durationSec: parseInt(e.target.value) || 12,
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* 1.5. Mid-Roll Video Ad Configuration (YouTube-Style) */}
              <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-bold text-white flex items-center gap-2">
                    <Tv className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span>In-Player Mid-Roll Video Ads (YouTube-Style Custom Interval Triggers)</span>
                  </h5>

                  <button
                    onClick={() => {
                      const currentMidroll = adminState.ads.midroll || {
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
                      };
                      updateAdEngineSettings({
                        midroll: {
                          ...currentMidroll,
                          enabled: !currentMidroll.enabled,
                        },
                      });
                      showToast((adminState.ads.midroll?.enabled ?? true) ? 'Mid-Roll Ads Disabled' : 'Mid-Roll Ads Enabled');
                    }}
                    className={`text-2xl cursor-pointer ${
                      (adminState.ads.midroll?.enabled ?? true) ? 'text-amber-500' : 'text-neutral-600'
                    }`}
                  >
                    {(adminState.ads.midroll?.enabled ?? true) ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-neutral-400 mb-1">
                      Mid-Roll Trigger Intervals (Comma-separated Minutes elapsed, e.g. 5, 15, 25):
                    </label>
                    <input
                      type="text"
                      value={(adminState.ads.midroll?.intervalsMin || [5, 15, 25]).join(', ')}
                      onChange={(e) => {
                        const vals = e.target.value
                          .split(',')
                          .map((s) => parseInt(s.trim()))
                          .filter((n) => !isNaN(n));
                        updateAdEngineSettings({
                          midroll: {
                            ...(adminState.ads.midroll || {
                              enabled: true,
                              durationSec: 15,
                              skipDelaySec: 5,
                              mediaType: 'video',
                              mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                              title: 'Solo Leveling: Arise — Download Now!',
                              sponsorName: 'Netmarble Sponsored',
                              ctaText: 'Play Free On PC & Mobile',
                              ctaLink: 'https://sololeveling.netmarble.com/',
                            }),
                            intervalsMin: vals,
                          },
                        });
                      }}
                      placeholder="e.g. 5, 15, 25"
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white font-mono"
                    />
                    <p className="text-[10px] text-neutral-500 mt-1">
                      Yellow ad timeline markers will automatically render on the progress bar seek timeline at these exact timestamps.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1">
                      Ad Title / Headline:
                    </label>
                    <input
                      type="text"
                      value={adminState.ads.midroll?.title || ''}
                      onChange={(e) =>
                        updateAdEngineSettings({
                          midroll: {
                            ...(adminState.ads.midroll || {
                              enabled: true,
                              intervalsMin: [5, 15, 25],
                              durationSec: 15,
                              skipDelaySec: 5,
                              mediaType: 'video',
                              mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                              sponsorName: 'Netmarble Sponsored',
                              ctaText: 'Play Free On PC & Mobile',
                              ctaLink: 'https://sololeveling.netmarble.com/',
                            }),
                            title: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1">
                      Sponsor Label:
                    </label>
                    <input
                      type="text"
                      value={adminState.ads.midroll?.sponsorName || ''}
                      onChange={(e) =>
                        updateAdEngineSettings({
                          midroll: {
                            ...(adminState.ads.midroll || {
                              enabled: true,
                              intervalsMin: [5, 15, 25],
                              durationSec: 15,
                              skipDelaySec: 5,
                              mediaType: 'video',
                              mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                              title: 'Solo Leveling: Arise — Download Now!',
                              ctaText: 'Play Free On PC & Mobile',
                              ctaLink: 'https://sololeveling.netmarble.com/',
                            }),
                            sponsorName: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1 flex items-center justify-between">
                      <span>Media Video URL (MP4 / WebM or VAST XML Tag):</span>
                      <span className="text-[10px] text-amber-400 font-mono font-normal">Auto-parses VAST XML</span>
                    </label>
                    <input
                      type="text"
                      placeholder="https://vapid-size.com/... or https://.../ad.mp4"
                      value={adminState.ads.midroll?.mediaUrl || ''}
                      onChange={(e) =>
                        updateAdEngineSettings({
                          midroll: {
                            ...(adminState.ads.midroll || {
                              enabled: true,
                              intervalsMin: [5, 15, 25],
                              durationSec: 15,
                              skipDelaySec: 5,
                              mediaType: 'video',
                              title: 'Solo Leveling: Arise — Download Now!',
                              sponsorName: 'Netmarble Sponsored',
                              ctaText: 'Play Free On PC & Mobile',
                              ctaLink: 'https://sololeveling.netmarble.com/',
                            }),
                            mediaUrl: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-neutral-500 mt-1">
                      Supports direct MP4 video files or VAST 2.0/3.0/4.0 XML endpoints (e.g. vapid-size.com). The player will extract the MediaFile automatically.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1">
                      Destination / CTA Link:
                    </label>
                    <input
                      type="text"
                      value={adminState.ads.midroll?.ctaLink || ''}
                      onChange={(e) =>
                        updateAdEngineSettings({
                          midroll: {
                            ...(adminState.ads.midroll || {
                              enabled: true,
                              intervalsMin: [5, 15, 25],
                              durationSec: 15,
                              skipDelaySec: 5,
                              mediaType: 'video',
                              mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                              title: 'Solo Leveling: Arise — Download Now!',
                              sponsorName: 'Netmarble Sponsored',
                              ctaText: 'Play Free On PC & Mobile',
                            }),
                            ctaLink: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1">
                      Skip Delay Countdown (Seconds):
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={adminState.ads.midroll?.skipDelaySec ?? 5}
                      onChange={(e) =>
                        updateAdEngineSettings({
                          midroll: {
                            ...(adminState.ads.midroll || {
                              enabled: true,
                              intervalsMin: [5, 15, 25],
                              durationSec: 15,
                              mediaType: 'video',
                              mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                              title: 'Solo Leveling: Arise — Download Now!',
                              sponsorName: 'Netmarble Sponsored',
                              ctaText: 'Play Free On PC & Mobile',
                              ctaLink: 'https://sololeveling.netmarble.com/',
                            }),
                            skipDelaySec: parseInt(e.target.value) || 5,
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1">
                      Total Duration (Seconds):
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={adminState.ads.midroll?.durationSec ?? 15}
                      onChange={(e) =>
                        updateAdEngineSettings({
                          midroll: {
                            ...(adminState.ads.midroll || {
                              enabled: true,
                              intervalsMin: [5, 15, 25],
                              skipDelaySec: 5,
                              mediaType: 'video',
                              mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                              title: 'Solo Leveling: Arise — Download Now!',
                              sponsorName: 'Netmarble Sponsored',
                              ctaText: 'Play Free On PC & Mobile',
                              ctaLink: 'https://sololeveling.netmarble.com/',
                            }),
                            durationSec: parseInt(e.target.value) || 15,
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* 1.8. Global 3rd Party Script Verification & Injection */}
              <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
                <div>
                  <h5 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span>Global Ad Network Script Verification & Injection (PropellerAds, PopAds, Monetag, GTM)</span>
                  </h5>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Dynamically inject scripts into the app's DOM for instant publisher ownership verification and auto-delivering ads. Active VIP members are 100% immune and will bypass these scripts entirely.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1">
                      Header Custom Scripts (&lt;head&gt;):
                    </label>
                    <textarea
                      rows={5}
                      value={adminState.ads.headerCustomScripts || ''}
                      onChange={(e) =>
                        updateAdEngineSettings({
                          headerCustomScripts: e.target.value,
                        })
                      }
                      placeholder="e.g. <script src='https://verify.monetag.com/code.js'></script>"
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1">
                      Body Custom Scripts (Footer / &lt;body&gt;):
                    </label>
                    <textarea
                      rows={5}
                      value={adminState.ads.bodyCustomScripts || ''}
                      onChange={(e) =>
                        updateAdEngineSettings({
                          bodyCustomScripts: e.target.value,
                        })
                      }
                      placeholder="e.g. <!-- PopAds popunder script codes -->"
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Banner Ads (AnizenX Ad Network Banner & Placements) */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-neutral-900/90 border border-purple-500/30 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                        <Tv className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>AnizenX Ad Network Banner (Sidebar & Detail Modals)</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                            adminState.ads.sidebarBanner.enabled
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                          }`}>
                            {adminState.ads.sidebarBanner.enabled ? 'Banner Active' : 'Banner Hidden'}
                          </span>
                        </h5>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          Manages the AnizenX Ad Network banner displayed globally across anime detail modals, sidebar feeds, and content pages.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-neutral-400 hidden sm:inline">
                        Global Banner Toggle:
                      </span>
                      <button
                        id="admin-toggle-sidebar-banner"
                        onClick={() => {
                          const next = !adminState.ads.sidebarBanner.enabled;
                          updateAdEngineSettings({
                            sidebarBanner: {
                              ...adminState.ads.sidebarBanner,
                              enabled: next,
                            },
                          });
                          showToast(next ? 'AnizenX Ad Banner Enabled Globally' : 'AnizenX Ad Banner Hidden Globally');
                        }}
                        className={`text-2xl cursor-pointer transition-colors ${
                          adminState.ads.sidebarBanner.enabled ? 'text-purple-400' : 'text-neutral-600'
                        }`}
                      >
                        {adminState.ads.sidebarBanner.enabled ? (
                          <ToggleRight className="w-8 h-8" />
                        ) : (
                          <ToggleLeft className="w-8 h-8" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-800/80 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Custom Ad Script / HTML Code (e.g., HilltopAds / Third-party Ad Network Code):
                      </label>
                      <textarea
                        rows={4}
                        placeholder="<script type='text/javascript' src='//massivesalad.com/tag.min.js' data-zone='...'></script>"
                        value={adminState.ads.sidebarBanner.customHtml || ''}
                        onChange={(e) =>
                          updateAdEngineSettings({
                            sidebarBanner: {
                              ...adminState.ads.sidebarBanner,
                              customHtml: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                      />
                      <p className="text-[11px] text-neutral-400 mt-1">
                        Paste raw JavaScript <code className="text-purple-400">&lt;script&gt;</code> tags or HTML snippets from ad networks (such as HilltopAds, Adsterra, or banner tags). Scripts execute dynamically when the banner is toggled active.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Header & Below Player Banners */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Header Banner */}
                  <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-white uppercase tracking-wide">
                        Header Banner Placement
                      </h5>
                      <input
                        type="checkbox"
                        checked={adminState.ads.headerBanner.enabled}
                        onChange={(e) =>
                          updateAdEngineSettings({
                            headerBanner: {
                              ...adminState.ads.headerBanner,
                              enabled: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-neutral-400">Title:</label>
                      <input
                        type="text"
                        value={adminState.ads.headerBanner.title}
                        onChange={(e) =>
                          updateAdEngineSettings({
                            headerBanner: {
                              ...adminState.ads.headerBanner,
                              title: e.target.value,
                            },
                          })
                        }
                        className="w-full px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-neutral-400">Image URL:</label>
                      <input
                        type="text"
                        value={adminState.ads.headerBanner.imageUrl}
                        onChange={(e) =>
                          updateAdEngineSettings({
                            headerBanner: {
                              ...adminState.ads.headerBanner,
                              imageUrl: e.target.value,
                            },
                          })
                        }
                        className="w-full px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Below Player Banner */}
                  <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-white uppercase tracking-wide">
                        Below Player Banner Placement
                      </h5>
                      <input
                        type="checkbox"
                        checked={adminState.ads.playerBanner.enabled}
                        onChange={(e) =>
                          updateAdEngineSettings({
                            playerBanner: {
                              ...adminState.ads.playerBanner,
                              enabled: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-neutral-400">Title:</label>
                      <input
                        type="text"
                        value={adminState.ads.playerBanner.title}
                        onChange={(e) =>
                          updateAdEngineSettings({
                            playerBanner: {
                              ...adminState.ads.playerBanner,
                              title: e.target.value,
                            },
                          })
                        }
                        className="w-full px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-neutral-400">Image URL:</label>
                      <input
                        type="text"
                        value={adminState.ads.playerBanner.imageUrl}
                        onChange={(e) =>
                          updateAdEngineSettings({
                            playerBanner: {
                              ...adminState.ads.playerBanner,
                              imageUrl: e.target.value,
                            },
                          })
                        }
                        className="w-full px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SERVER HEALTH & MAINTENANCE */}
          {activeTab === 'servers' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Maintenance Master Switch */}
              <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      <span>Global Site Maintenance Mode</span>
                    </h4>
                    <p className="text-xs text-neutral-400 mt-1">
                      Instantly locks the front-end for general viewers while allowing admin access via passcode
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const next = !adminState.servers.maintenanceMode;
                      toggleMaintenanceMode(next);
                      showToast(next ? 'Maintenance Mode ENABLED' : 'Maintenance Mode DISABLED');
                    }}
                    className={`text-2xl cursor-pointer ${
                      adminState.servers.maintenanceMode ? 'text-rose-500' : 'text-neutral-600'
                    }`}
                  >
                    {adminState.servers.maintenanceMode ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">
                    Maintenance Notice (Displayed to Visitors):
                  </label>
                  <textarea
                    rows={2}
                    value={adminState.servers.maintenanceNotice}
                    onChange={(e) => updateServerConfig({ maintenanceNotice: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              {/* Server Nodes Status Toggles */}
              <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-4">
                <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Cluster Streaming Nodes
                </h4>

                <div className="space-y-3">
                  {adminState.servers.servers.map((srv) => (
                    <div
                      key={srv.id}
                      className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Server className="w-5 h-5 text-neutral-400 shrink-0" />
                        <div className="min-w-0 truncate">
                          <h5 className="text-xs font-bold text-white truncate">{srv.name}</h5>
                          <p className="text-[11px] text-neutral-500 font-mono">
                            {srv.location} • Ping: {srv.pingMs}ms • Load: {srv.loadPercent}%
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {(['online', 'degraded', 'standby', 'offline'] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() => {
                              setServerStatus(srv.id, st);
                              showToast(`${srv.name.split(' ')[0]} status set to ${st}`);
                            }}
                            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                              srv.status === st
                                ? st === 'online'
                                  ? 'bg-emerald-500 text-black font-extrabold shadow-md'
                                  : st === 'degraded'
                                  ? 'bg-amber-500 text-black font-extrabold'
                                  : 'bg-rose-600 text-white font-extrabold'
                                : 'bg-neutral-900 text-neutral-400 hover:text-white'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Passcode Management */}
              <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-4">
                <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-rose-500" />
                  <span>Update Admin Passcode</span>
                </h4>

                <form onSubmit={handleSavePasscode} className="flex flex-col sm:flex-row gap-3 max-w-md">
                  <input
                    type="password"
                    placeholder="Enter new 4+ digit passcode"
                    value={newPasscode}
                    onChange={(e) => setNewPasscode(e.target.value)}
                    className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Save Passcode
                  </button>
                </form>

                {passcodeChangedMsg && (
                  <p className="text-xs text-emerald-400 font-mono font-semibold">{passcodeChangedMsg}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Creating / Editing Anime Title */}
      {isEditingAnimeModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-2xl p-6 text-neutral-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h4 className="text-sm font-bold text-white">Add / Edit Anime Title</h4>
              <button
                onClick={() => setIsEditingAnimeModal(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-neutral-400">Title:</label>
                <input
                  type="text"
                  value={editingAnimeForm.title || ''}
                  onChange={(e) => setEditingAnimeForm({ ...editingAnimeForm, title: e.target.value })}
                  className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400">Poster Image URL:</label>
                <input
                  type="text"
                  value={editingAnimeForm.images?.jpg?.imageUrl || ''}
                  onChange={(e) =>
                    setEditingAnimeForm({
                      ...editingAnimeForm,
                      images: { jpg: { imageUrl: e.target.value } },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-xs text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400">Episodes:</label>
                  <input
                    type="number"
                    value={editingAnimeForm.episodes || 12}
                    onChange={(e) =>
                      setEditingAnimeForm({
                        ...editingAnimeForm,
                        episodes: parseInt(e.target.value) || 12,
                      })
                    }
                    className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400">Score:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingAnimeForm.score || 8.5}
                    onChange={(e) =>
                      setEditingAnimeForm({
                        ...editingAnimeForm,
                        score: parseFloat(e.target.value) || 8.5,
                      })
                    }
                    className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-xs text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
              <button
                onClick={() => setIsEditingAnimeModal(false)}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-bold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editingAnimeForm.title) {
                    addOrUpdateCustomAnime(editingAnimeForm as AnimeItem);
                    setIsEditingAnimeModal(false);
                    loadCatalog();
                    showToast(`Saved anime "${editingAnimeForm.title}"`);
                  }
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Save Anime
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
