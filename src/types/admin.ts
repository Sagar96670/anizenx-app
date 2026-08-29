import { AnimeEpisode } from './anime';

export interface VipPlan {
  id: string;
  name: string;
  priceInr: number;
  priceUsd: number;
  duration: string;
  durationDays: number;
  badge?: string;
  features: string[];
  active: boolean;
  color: 'rose' | 'amber' | 'purple' | 'emerald' | 'cyan';
}

export interface VipUser {
  isVip: boolean;
  tier: string;
  planId?: string;
  planName?: string;
  activatedAt?: string;
  expiresAt?: string; // ISO string or 'lifetime'
  userId: string;
  userName?: string;
  email?: string;
  paymentMethod?: string;
  transactionId?: string;
  photoURL?: string;
}

export interface RewardedAdConfig {
  enabled: boolean;
  adNetworkUrl: string;
  cooldownMinutes: number; // default: 30 mins
}

export interface PrerollAdConfig {
  enabled: boolean;
  durationSec: number;
  skipDelaySec: number;
  mediaType: 'video' | 'image';
  mediaUrl: string;
  title: string;
  sponsorName: string;
  ctaText: string;
  ctaLink: string;
  vastUrl?: string;
}

export interface BannerAdPlacement {
  enabled: boolean;
  imageUrl: string;
  targetUrl: string;
  title: string;
  subtitle?: string;
  badgeText?: string;
  customHtml?: string;
}

export interface PopunderConfig {
  enabled: boolean;
  directUrl: string;
  frequencyMinutes: number;
}

export interface MidrollAdConfig {
  enabled: boolean;
  intervalsMin: number[]; // Customizable time intervals e.g. [5, 15, 25] in minutes
  durationSec: number;
  skipDelaySec: number;
  mediaType: 'video' | 'image';
  mediaUrl: string;
  title: string;
  sponsorName: string;
  ctaText: string;
  ctaLink: string;
  vastUrl?: string;
}

export interface DynamicAdEngineSettings {
  masterAdsEnabled: boolean;
  rewardedAd: RewardedAdConfig;
  preroll: PrerollAdConfig;
  midroll: MidrollAdConfig;
  headerBanner: BannerAdPlacement;
  playerBanner: BannerAdPlacement;
  sidebarBanner: BannerAdPlacement;
  popunder: PopunderConfig;
  antiAdblockWrapping: boolean;
  headerCustomScripts?: string;
  bodyCustomScripts?: string;
}

export interface ServerStatusItem {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'degraded' | 'offline' | 'standby';
  pingMs: number;
  loadPercent: number;
  location: string;
}

export interface ServerManagementConfig {
  maintenanceMode: boolean;
  maintenanceNotice: string;
  estimatedUptime?: string;
  servers: ServerStatusItem[];
}

export interface AnimeOverrideData {
  id: string | number;
  slug?: string;
  ratingOverride?: number;
  viewsOverride?: number;
  customBadges?: string[]; // e.g. ['HOT', 'FULL DUB', '4K ULTRA', 'EXCLUSIVE', 'RAW']
  pinnedToHero?: boolean;
  hidden?: boolean;
  isPremiumOnly?: boolean;
  freeEpisodesThreshold?: number; // e.g. first 3 free, remaining locked
  lockedEpisodeNumbers?: number[]; // specific episode numbers
  hiddenEpisodeNumbers?: number[]; // specific hidden episodes e.g. [4]
  customEpisodes?: AnimeEpisode[];
}

export interface AdminAnalyticsMetrics {
  totalStreamsToday: number;
  activeVipMembers: number;
  totalAdImpressions: number;
  serverBandwidthGb: number;
  monthlyRevenueInr: number;
}

export interface PaymentSettings {
  phonePeQrUrl: string;
  upiId: string;
  merchantId: string;
  bankAccount: string;
  ifscCode: string;
  accountHolder: string;
  phonePeApiKey?: string;
  isMembershipSystemEnabled?: boolean;
  updatedAt?: string;
}

export interface VipRequest {
  id: string;
  userId: string;
  userName: string;
  email: string;
  planId: string;
  planName: string;
  priceInr: number;
  transactionId: string; // UTR Number
  proofImageUrl: string; // base64 or storage url
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
  rejectReason?: string;
}

export interface PhonePeInitiateResponse {
  success: boolean;
  merchantTransactionId: string;
  redirectUrl: string;
  upiIntentUrl?: string;
  amount: number;
  message?: string;
}

export interface PhonePeStatusResponse {
  success: boolean;
  status: 'pending' | 'success' | 'failed';
  data?: {
    userId: string;
    planId: string;
    planName: string;
    priceInr: number;
    paymentMethod: string;
    updatedAt: string;
  };
}

