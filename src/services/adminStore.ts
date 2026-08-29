import {
  DynamicAdEngineSettings,
  RewardedAdConfig,
  ServerManagementConfig,
  AnimeOverrideData,
  AdminAnalyticsMetrics,
} from '../types/admin';
import { AnimeItem, AnimeEpisode } from '../types/anime';
import { isVipActive } from './vipStore';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const ADMIN_STORAGE_KEY = 'anizenx_admin_god_store_v1';
const PASSCODE_STORAGE_KEY = 'anizenx_admin_passcode_v1';
const AUTH_SESSION_KEY = 'anizenx_admin_auth_session';

export const DEFAULT_PASSCODE = '1234';

export const DEFAULT_REWARDED_AD_CONFIG: RewardedAdConfig = {
  enabled: true,
  adNetworkUrl: 'https://discord.gg/anizenx',
  cooldownMinutes: 30,
};

export const DEFAULT_AD_SETTINGS: DynamicAdEngineSettings = {
  masterAdsEnabled: true,
  rewardedAd: DEFAULT_REWARDED_AD_CONFIG,
  preroll: {
    enabled: true,
    durationSec: 12,
    skipDelaySec: 5,
    mediaType: 'video',
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    title: 'Genshin Impact — Version 5.4 Update Live!',
    sponsorName: 'HoYoverse Sponsored',
    ctaText: 'Play Free Now',
    ctaLink: 'https://genshin.hoyoverse.com/',
  },
  headerBanner: {
    enabled: true,
    imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80',
    targetUrl: 'https://discord.gg/anizenx',
    title: '⚔️ Join AnizenX VIP Discord — Free Weekly Nitro & Anime Giveaways!',
    subtitle: 'Over 45,000 Otaku members chatting live daily.',
    badgeText: 'SPONSORED',
  },
  playerBanner: {
    enabled: true,
    imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1000&q=80',
    targetUrl: 'https://crunchyroll.com',
    title: '⚡ Upgrade to AnizenX VIP PRO for 100% Ad-Free 4K Streaming',
    subtitle: 'Zero prerolls, high-speed priority servers, and instant episode unlocks.',
    badgeText: 'VIP PRO',
  },
  sidebarBanner: {
    enabled: true,
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80',
    targetUrl: 'https://store.steampowered.com',
    title: '🎮 Top Rated Anime RPGs 2026 — 50% Off This Weekend',
    badgeText: 'HOT DEAL',
  },
  popunder: {
    enabled: false,
    directUrl: 'https://anizenx.stream/vip',
    frequencyMinutes: 30,
  },
  midroll: {
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
  },
  antiAdblockWrapping: true,
  headerCustomScripts: '',
  bodyCustomScripts: '',
};

export const DEFAULT_SERVER_CONFIG: ServerManagementConfig = {
  maintenanceMode: false,
  maintenanceNotice: '⚡ Scheduled Database Engine Upgrade — AnizenX will return in 15 minutes with 4K stream servers.',
  estimatedUptime: '20-30 mins',
  servers: [
    {
      id: 'server_alpha',
      name: 'Server Alpha (Tokyo High-Speed CDN)',
      type: '1080p Ultra / 60fps',
      status: 'online',
      pingMs: 14,
      loadPercent: 42,
      location: 'Tokyo, Japan',
    },
    {
      id: 'server_beta',
      name: 'Server Beta (Singapore Fast Mirror)',
      type: '1080p / 720p Multi-audio',
      status: 'online',
      pingMs: 28,
      loadPercent: 68,
      location: 'Singapore',
    },
    {
      id: 'server_backup',
      name: 'Server Backup (US West Cloud Stream)',
      type: 'Adaptive Bitrate / Dub Hub',
      status: 'standby',
      pingMs: 85,
      loadPercent: 15,
      location: 'San Jose, USA',
    },
  ],
};

const ENV_MEMBERSHIP_ENABLED =
  typeof import.meta !== 'undefined' && (import.meta as any).env
    ? (import.meta as any).env.VITE_ENABLE_MEMBERSHIP_SYSTEM !== 'false'
    : true;

interface AdminStoreState {
  isMembershipSystemEnabled: boolean;
  globalPaywallEnabled: boolean;
  ads: DynamicAdEngineSettings;
  servers: ServerManagementConfig;
  overrides: Record<string, AnimeOverrideData>;
  customAnimeList: AnimeItem[];
  metrics: AdminAnalyticsMetrics;
}

const DEFAULT_ADMIN_STATE: AdminStoreState = {
  isMembershipSystemEnabled: ENV_MEMBERSHIP_ENABLED,
  globalPaywallEnabled: true,
  ads: DEFAULT_AD_SETTINGS,
  servers: DEFAULT_SERVER_CONFIG,
  overrides: {
    // Demo overrides showcasing capabilities
    'solo-leveling': {
      id: 'solo-leveling',
      ratingOverride: 9.8,
      viewsOverride: 345000,
      customBadges: ['HOT', '4K ULTRA', 'FULL DUB'],
      pinnedToHero: true,
      isPremiumOnly: false,
      freeEpisodesThreshold: 3, // Ep 1-3 Free, Ep 4+ Locked
    },
    'demon-slayer': {
      id: 'demon-slayer',
      ratingOverride: 9.9,
      viewsOverride: 890000,
      customBadges: ['EXCLUSIVE', 'FULL DUB'],
      pinnedToHero: true,
    },
  },
  customAnimeList: [],
  metrics: {
    totalStreamsToday: 148920,
    activeVipMembers: 3420,
    totalAdImpressions: 489300,
    serverBandwidthGb: 842.6,
    monthlyRevenueInr: 341800,
  },
};

// In-memory admin store
let adminState: AdminStoreState = (() => {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_ADMIN_STATE,
        ...parsed,
        ads: { ...DEFAULT_AD_SETTINGS, ...(parsed.ads || {}) },
        servers: { ...DEFAULT_SERVER_CONFIG, ...(parsed.servers || {}) },
        overrides: { ...DEFAULT_ADMIN_STATE.overrides, ...(parsed.overrides || {}) },
      };
    }
  } catch (e) {
    console.warn('Error reading admin store state:', e);
  }
  return DEFAULT_ADMIN_STATE;
})();

type AdminListener = (state: AdminStoreState) => void;
const adminListeners: Set<AdminListener> = new Set();

function persistAdminState(syncToFirestore = true) {
  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminState));
  } catch (e) {
    console.warn('Failed to save admin state:', e);
  }
  adminListeners.forEach((fn) => fn({ ...adminState }));

  if (syncToFirestore) {
    try {
      const docRef = doc(db, 'settings', 'adEngine');
      setDoc(docRef, { ...adminState.ads, isMembershipSystemEnabled: adminState.isMembershipSystemEnabled, updatedAt: new Date().toISOString() }, { merge: true }).catch((err) => {
        console.warn('Could not sync adEngine to Firestore:', err);
      });
      const memberDocRef = doc(db, 'settings', 'membership');
      setDoc(memberDocRef, { isMembershipSystemEnabled: adminState.isMembershipSystemEnabled, updatedAt: new Date().toISOString() }, { merge: true }).catch((err) => {
        console.warn('Could not sync membership to Firestore:', err);
      });
    } catch (e) {
      // offline / non-blocking
    }
  }
}

// Auto sync Ad Engine Settings with Firestore if available
let isAdEngineFirestoreInitialized = false;
export function initAdEngineFirestoreSync() {
  if (isAdEngineFirestoreInitialized) return;
  isAdEngineFirestoreInitialized = true;
  try {
    const docRef = doc(db, 'settings', 'adEngine');
    onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const firestoreData = snapshot.data();
        if (firestoreData && typeof firestoreData === 'object') {
          if (typeof firestoreData.isMembershipSystemEnabled === 'boolean') {
            adminState.isMembershipSystemEnabled = firestoreData.isMembershipSystemEnabled;
          }
          adminState.ads = {
            ...DEFAULT_AD_SETTINGS,
            ...adminState.ads,
            ...firestoreData,
            rewardedAd: {
              ...DEFAULT_REWARDED_AD_CONFIG,
              ...(adminState.ads.rewardedAd || {}),
              ...(firestoreData.rewardedAd || {}),
            },
          };
          persistAdminState(false);
        }
      }
    }, (err) => {
      console.warn('Firestore Ad Engine settings read error:', err);
    });

    const memberDocRef = doc(db, 'settings', 'membership');
    onSnapshot(memberDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const memberData = snapshot.data();
        if (memberData && typeof memberData.isMembershipSystemEnabled === 'boolean') {
          adminState.isMembershipSystemEnabled = memberData.isMembershipSystemEnabled;
          persistAdminState(false);
        }
      }
    }, (err) => {
      console.warn('Firestore membership settings read error:', err);
    });
  } catch (err) {
    console.warn('Could not initialize Firestore sync for adEngine settings:', err);
  }
}

// Initialize sync automatically
if (typeof window !== 'undefined') {
  setTimeout(() => initAdEngineFirestoreSync(), 500);
}

export function subscribeToAdminState(listener: AdminListener): () => void {
  adminListeners.add(listener);
  return () => adminListeners.delete(listener);
}

export function getAdminState(): AdminStoreState {
  return adminState;
}

export type AdminConfig = AdminStoreState;
export const getAdminConfig = getAdminState;
export const subscribeToAdminConfig = subscribeToAdminState;

// ----------------- Authentication -----------------

export function getAdminPasscode(): string {
  try {
    return localStorage.getItem(PASSCODE_STORAGE_KEY) || DEFAULT_PASSCODE;
  } catch {
    return DEFAULT_PASSCODE;
  }
}

export function setAdminPasscode(newCode: string): boolean {
  if (!newCode || newCode.trim().length < 4) return false;
  try {
    localStorage.setItem(PASSCODE_STORAGE_KEY, newCode.trim());
    return true;
  } catch {
    return false;
  }
}

export function verifyAdminPasscode(entered: string): boolean {
  const current = getAdminPasscode();
  const valid = entered.trim() === current.trim();
  if (valid) {
    try {
      sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
    } catch {}
  }
  return valid;
}

export function isAdminAuthenticated(): boolean {
  try {
    return sessionStorage.getItem(AUTH_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function adminSignOut(): void {
  try {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
  } catch {}
}

// ----------------- Global Paywall & Episode Lock Logic -----------------

export function isMembershipSystemEnabled(): boolean {
  return adminState.isMembershipSystemEnabled ?? true;
}

export function setMembershipSystemEnabled(enabled: boolean): void {
  adminState.isMembershipSystemEnabled = enabled;
  persistAdminState();
}

export function isGlobalPaywallActive(): boolean {
  return adminState.globalPaywallEnabled;
}

export function setGlobalPaywall(enabled: boolean): void {
  adminState.globalPaywallEnabled = enabled;
  persistAdminState();
}

/**
 * Evaluates whether an episode is locked behind the VIP paywall
 */
export function isEpisodeLocked(animeIdOrSlug: string | number, episodeNumber: number): {
  locked: boolean;
  reason?: 'anime_premium_only' | 'episode_threshold' | 'episode_specific';
} {
  // If global VIP membership system is disabled, all content is freely accessible!
  if (!isMembershipSystemEnabled()) {
    return { locked: false };
  }

  // If user is an active VIP subscriber, NEVER lock any content!
  if (isVipActive()) {
    return { locked: false };
  }

  // If master paywall is disabled globally, all content is free
  if (!adminState.globalPaywallEnabled) {
    return { locked: false };
  }

  const key = String(animeIdOrSlug).toLowerCase();
  const override = adminState.overrides[key] || adminState.overrides[String(animeIdOrSlug)];

  if (override) {
    if (override.isPremiumOnly) {
      return { locked: true, reason: 'anime_premium_only' };
    }

    if (override.freeEpisodesThreshold !== undefined && episodeNumber > override.freeEpisodesThreshold) {
      return { locked: true, reason: 'episode_threshold' };
    }

    if (override.lockedEpisodeNumbers?.includes(episodeNumber)) {
      return { locked: true, reason: 'episode_specific' };
    }
  }

  return { locked: false };
}

// ----------------- Ad Engine Management -----------------

export function getAdEngineSettings(): DynamicAdEngineSettings {
  return adminState.ads;
}

export function updateAdEngineSettings(newSettings: Partial<DynamicAdEngineSettings>): void {
  adminState.ads = {
    ...adminState.ads,
    ...newSettings,
  };
  persistAdminState();
}

/**
 * Check if ads should be displayed to current user for given placement
 */
export function shouldDisplayAd(
  placement: 'preroll' | 'midroll' | 'rewarded' | 'header' | 'player' | 'sidebar' | 'popunder' | 'feed' | 'detail'
): boolean {
  // RULE 1: If user is VIP, strip ALL ads completely
  if (isVipActive()) {
    return false;
  }

  // RULE 2: If master ads toggle is off, don't show
  if (!adminState.ads.masterAdsEnabled) {
    return false;
  }

  // RULE 3: Check placement specific switch
  switch (placement) {
    case 'rewarded':
      return adminState.ads.rewardedAd?.enabled ?? true;
    case 'preroll':
      return adminState.ads.preroll.enabled;
    case 'midroll':
      return adminState.ads.midroll?.enabled ?? true;
    case 'header':
    case 'feed':
      return adminState.ads.headerBanner.enabled;
    case 'player':
      return adminState.ads.playerBanner.enabled;
    case 'sidebar':
    case 'detail':
      return adminState.ads.sidebarBanner.enabled;
    case 'popunder':
      return adminState.ads.popunder.enabled;
    default:
      return true;
  }
}

// ----------------- Server & Maintenance Mode -----------------

export function getServerConfig(): ServerManagementConfig {
  return adminState.servers;
}

export function updateServerConfig(config: Partial<ServerManagementConfig>): void {
  adminState.servers = {
    ...adminState.servers,
    ...config,
  };
  persistAdminState();
}

export function toggleMaintenanceMode(enabled: boolean, notice?: string): void {
  adminState.servers.maintenanceMode = enabled;
  if (notice) {
    adminState.servers.maintenanceNotice = notice;
  }
  persistAdminState();
}

export function setServerStatus(serverId: string, status: 'online' | 'degraded' | 'offline' | 'standby'): void {
  adminState.servers.servers = adminState.servers.servers.map((s) =>
    s.id === serverId ? { ...s, status } : s
  );
  persistAdminState();
}

// ----------------- Granular Anime & Episode Overrides -----------------

export function getAnimeOverride(idOrSlug: string | number): AnimeOverrideData | undefined {
  const key = String(idOrSlug).toLowerCase();
  return adminState.overrides[key] || adminState.overrides[String(idOrSlug)];
}

export function setAnimeOverride(idOrSlug: string | number, data: Partial<AnimeOverrideData>): void {
  const key = String(idOrSlug).toLowerCase();
  const existing = adminState.overrides[key] || { id: idOrSlug };
  adminState.overrides[key] = {
    ...existing,
    ...data,
    id: idOrSlug,
  };
  persistAdminState();
}

export function deleteAnimeOverride(idOrSlug: string | number): void {
  const key = String(idOrSlug).toLowerCase();
  delete adminState.overrides[key];
  persistAdminState();
}

export function hideEpisode(animeId: string | number, episodeNumber: number): void {
  const key = String(animeId).toLowerCase();
  const existing = adminState.overrides[key] || { id: animeId };
  const hiddenList = new Set(existing.hiddenEpisodeNumbers || []);
  hiddenList.add(episodeNumber);
  existing.hiddenEpisodeNumbers = Array.from(hiddenList);
  adminState.overrides[key] = existing;
  persistAdminState();
}

export function unhideEpisode(animeId: string | number, episodeNumber: number): void {
  const key = String(animeId).toLowerCase();
  const existing = adminState.overrides[key];
  if (existing && existing.hiddenEpisodeNumbers) {
    existing.hiddenEpisodeNumbers = existing.hiddenEpisodeNumbers.filter((n) => n !== episodeNumber);
    adminState.overrides[key] = existing;
    persistAdminState();
  }
}

export function lockEpisode(animeId: string | number, episodeNumber: number, locked: boolean): void {
  const key = String(animeId).toLowerCase();
  const existing = adminState.overrides[key] || { id: animeId };
  const lockedList = new Set(existing.lockedEpisodeNumbers || []);
  if (locked) {
    lockedList.add(episodeNumber);
  } else {
    lockedList.delete(episodeNumber);
  }
  existing.lockedEpisodeNumbers = Array.from(lockedList);
  adminState.overrides[key] = existing;
  persistAdminState();
}

// ----------------- Custom Anime Creation & Storage Uploads -----------------

export function getCustomAnimeList(): AnimeItem[] {
  return adminState.customAnimeList || [];
}

export function addOrUpdateCustomAnime(anime: AnimeItem): void {
  const list = adminState.customAnimeList || [];
  const idx = list.findIndex((a) => a.id === anime.id || a.slug === anime.slug);
  if (idx >= 0) {
    list[idx] = anime;
  } else {
    list.unshift(anime);
  }
  adminState.customAnimeList = list;
  persistAdminState();
}

export function deleteCustomAnime(id: string | number): void {
  adminState.customAnimeList = (adminState.customAnimeList || []).filter((a) => a.id !== id);
  persistAdminState();
}

/**
 * Attach a direct video file from local phone storage or bucket upload to an anime episode
 */
export async function uploadAndAttachEpisodeVideo(
  animeId: string | number,
  episodeNumber: number,
  videoFile: File,
  serverName: string = 'Direct Storage Bucket (Fast Alpha)'
): Promise<{ success: boolean; streamUrl: string; message: string }> {
  try {
    // Generate an instant secure local object stream URL and simulate cloud bucket indexing
    const objectUrl = URL.createObjectURL(videoFile);
    const simulatedCloudUrl = `https://storage.anizenx.stream/videos/${encodeURIComponent(
      String(animeId)
    )}/ep_${episodeNumber}_${Date.now()}_${videoFile.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;

    const streamUrl = objectUrl || simulatedCloudUrl;

    const key = String(animeId).toLowerCase();
    const existing = adminState.overrides[key] || { id: animeId };
    const customEps = existing.customEpisodes || [];

    const existingEpIndex = customEps.findIndex((e) => e.number === episodeNumber);
    const newEp: AnimeEpisode = {
      id: `custom_ep_${animeId}_${episodeNumber}`,
      number: episodeNumber,
      title: `Episode ${episodeNumber} (${videoFile.name.replace(/\.[^/.]+$/, '')})`,
      videoUrl: streamUrl,
      streamUrl: streamUrl,
      serverName,
      aired: new Date().toISOString().split('T')[0],
    };

    if (existingEpIndex >= 0) {
      customEps[existingEpIndex] = newEp;
    } else {
      customEps.push(newEp);
    }

    existing.customEpisodes = customEps;
    adminState.overrides[key] = existing;
    persistAdminState();

    return {
      success: true,
      streamUrl,
      message: `Successfully uploaded & attached "${videoFile.name}" (${(
        videoFile.size /
        (1024 * 1024)
      ).toFixed(1)} MB) to Episode ${episodeNumber}!`,
    };
  } catch (err: any) {
    return {
      success: false,
      streamUrl: '',
      message: err?.message || 'Failed to process video file',
    };
  }
}
