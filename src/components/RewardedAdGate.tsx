import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Sparkles,
  ExternalLink,
  Gift,
  CheckCircle2,
  Tv,
  Crown,
  Loader2,
} from 'lucide-react';
import { isMembershipSystemEnabled, subscribeToAdminState } from '../services/adminStore';

interface RewardedAdGateProps {
  animeTitle?: string;
  episodeNumber?: number;
  onRewardUnlocked: () => void;
  onOpenVipModal?: () => void;
  adUrl?: string;
  rewardDurationMinutes?: number; // e.g. 30 minutes of unlocked streaming
  className?: string;
}

// Local storage keys for storing rewarded ad unlock timestamp
export const AD_UNLOCKED_TIME_KEY = 'anizenx_ad_unlocked_time';
const LEGACY_REWARDED_AD_STORAGE_KEY = 'anizenx_rewarded_ad_unlock_until';

/**
 * Check if the user has a valid active rewarded ad unlock within cooldown duration (in minutes)
 */
export function isRewardedAdCooldownActive(cooldownMinutes: number = 30): boolean {
  try {
    const rawTime = localStorage.getItem(AD_UNLOCKED_TIME_KEY);
    if (rawTime) {
      const unlockedTime = parseInt(rawTime, 10);
      if (!isNaN(unlockedTime)) {
        const elapsedMinutes = (Date.now() - unlockedTime) / (60 * 1000);
        if (elapsedMinutes < cooldownMinutes) {
          return true;
        }
      }
    }
    // Fallback check for legacy unlock timestamp key
    const legacyUntil = localStorage.getItem(LEGACY_REWARDED_AD_STORAGE_KEY);
    if (legacyUntil) {
      const expiry = parseInt(legacyUntil, 10);
      if (!isNaN(expiry) && Date.now() < expiry) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export const isRewardedAdActive = isRewardedAdCooldownActive;

/**
 * Save rewarded ad unlock timestamp to localStorage
 */
export function setRewardedAdUnlocked(cooldownMinutes: number = 30): void {
  try {
    const now = Date.now();
    localStorage.setItem(AD_UNLOCKED_TIME_KEY, now.toString());
    localStorage.setItem(LEGACY_REWARDED_AD_STORAGE_KEY, (now + cooldownMinutes * 60 * 1000).toString());
  } catch (e) {
    console.error('Failed to save rewarded ad state', e);
  }
}

export const RewardedAdGate: React.FC<RewardedAdGateProps> = ({
  animeTitle = 'Anime Episode',
  episodeNumber = 1,
  onRewardUnlocked,
  onOpenVipModal,
  adUrl = 'https://discord.gg/anizenx',
  rewardDurationMinutes = 30,
  className = '',
}) => {
  const [isWatchingAd, setIsWatchingAd] = useState<boolean>(false);
  const [adProgress, setAdProgress] = useState<number>(0);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [membershipEnabled, setMembershipEnabled] = useState<boolean>(isMembershipSystemEnabled());

  useEffect(() => {
    const unsub = subscribeToAdminState((s) => {
      setMembershipEnabled(s.isMembershipSystemEnabled ?? true);
    });
    return () => unsub();
  }, []);

  /**
   * Global and local custom JS function to trigger rewarded ad
   */
  const showRewardedAd = useCallback(() => {
    setIsWatchingAd(true);
    setAdProgress(0);

    // 1. Open ad URL or Monetag / ad network trigger in new tab
    try {
      if (typeof window !== 'undefined') {
        // Trigger Monetag or third-party ad tag if declared on window
        const win = window as unknown as {
          showRewardedAdNetwork?: () => void;
          monetagDirectLink?: string;
        };

        if (typeof win.showRewardedAdNetwork === 'function') {
          win.showRewardedAdNetwork();
        }

        const targetLink = win.monetagDirectLink || adUrl;
        if (targetLink) {
          window.open(targetLink, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (err) {
      console.warn('Ad link popup triggered', err);
    }

    // 2. Simulated rewarded ad verification / countdown
    const durationSec = 4; // 4 seconds verification window
    const intervalMs = 100;
    const totalSteps = (durationSec * 1000) / intervalMs;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const currentProgress = Math.min(100, Math.round((step / totalSteps) * 100));
      setAdProgress(currentProgress);

      if (step >= totalSteps) {
        clearInterval(timer);
        setIsWatchingAd(false);
        setIsUnlocked(true);
        setRewardedAdUnlocked(rewardDurationMinutes);

        // Auto unlock & render video player
        setTimeout(() => {
          onRewardUnlocked();
        }, 600);
      }
    }, intervalMs);
  }, [adUrl, onRewardUnlocked, rewardDurationMinutes]);

  // Expose showRewardedAd globally on window for external triggers/scripts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { showRewardedAd: () => void }).showRewardedAd = showRewardedAd;
    }
  }, [showRewardedAd]);

  return (
    <div
      id="rewarded-ad-gate-overlay"
      className={`absolute inset-0 z-40 flex flex-col items-center justify-center p-4 sm:p-6 bg-neutral-950/90 backdrop-blur-md text-neutral-100 select-none animate-fadeIn ${className}`}
    >
      {/* Blurred decorative ambient glow behind card */}
      <div className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-rose-600/15 blur-3xl pointer-events-none -z-10" />

      {/* Main Rewarded Ad Gate Card */}
      <div className="relative w-full max-w-md bg-neutral-900/95 border border-neutral-800/90 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col items-center text-center overflow-hidden">
        {/* Top Badges */}
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-[10px] sm:text-xs tracking-wider uppercase">
            <Gift className="w-3.5 h-3.5" />
            <span>Rewarded Access</span>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono text-[10px]">
            EP {episodeNumber}
          </span>
        </div>

        {/* Video Thumbnail / Icon Center */}
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-rose-600/30 mb-3.5 group">
          {isUnlocked ? (
            <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 animate-bounce text-white" />
          ) : isWatchingAd ? (
            <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 animate-spin text-white" />
          ) : (
            <Tv className="w-7 h-7 sm:w-8 sm:h-8" />
          )}
        </div>

        {/* Main Header Text */}
        <h3 className="text-base sm:text-lg font-black text-white leading-tight">
          Watch an Ad to Unlock Video
        </h3>
        <p className="text-xs sm:text-[13px] text-neutral-400 mt-1.5 mb-5 max-w-xs leading-relaxed">
          {isWatchingAd
            ? 'Verifying rewarded ad session... stream will start automatically.'
            : isUnlocked
            ? 'Reward verified! Starting stream in 1080p Ultra HD...'
            : `Watch a short sponsor ad to stream ${animeTitle} for free.`}
        </p>

        {/* Ad Progress Bar (When active) */}
        {isWatchingAd && (
          <div className="w-full mb-4 space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono text-neutral-400 px-0.5">
              <span>Unlocking Stream...</span>
              <span className="text-rose-400 font-bold">{adProgress}%</span>
            </div>
            <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden border border-neutral-700/50">
              <div
                className="h-full bg-gradient-to-r from-rose-600 to-amber-500 transition-all duration-100 ease-out"
                style={{ width: `${adProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          {/* Bright Red "Watch Ad" Button */}
          <button
            id="rewarded-ad-watch-btn"
            onClick={showRewardedAd}
            disabled={isWatchingAd || isUnlocked}
            className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black text-sm tracking-wide shadow-lg shadow-red-600/40 hover:shadow-red-600/60 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 border border-red-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isWatchingAd ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Sponsor Ad ({adProgress}%)...</span>
              </>
            ) : isUnlocked ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Video Unlocked! Starting...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Watch Ad to Unlock</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-75 ml-0.5" />
              </>
            )}
          </button>

          {/* Optional VIP Bypass Button (Only when VIP Membership system is active) */}
          {membershipEnabled && onOpenVipModal && (
            <button
              id="rewarded-ad-vip-btn"
              onClick={onOpenVipModal}
              className="w-full py-2 px-3 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-amber-300 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-neutral-700/60"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Or Skip All Ads with VIP Pass</span>
              <Sparkles className="w-3 h-3 text-amber-400" />
            </button>
          )}
        </div>

        {/* Footer Micro Notice */}
        <p className="text-[10px] text-neutral-500 font-mono mt-3">
          Watching unlocks uninterrupted free streaming for {rewardDurationMinutes} mins.
        </p>
      </div>
    </div>
  );
};
