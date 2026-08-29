import React from 'react';
import { VipUser, VipPlan } from '../types/admin';
import { logoutUser } from '../services/vipStore';
import { 
  X, 
  Crown, 
  User as UserIcon, 
  Mail, 
  ShieldCheck, 
  Sparkles, 
  LogOut, 
  Bookmark, 
  Tv, 
  Zap, 
  CheckCircle2, 
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: VipUser | null;
  plans: VipPlan[];
  onOpenVipModal: () => void;
  onOpenAdminModal?: () => void;
  onNavigateWatchlist: () => void;
  isAdmin: boolean;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  plans,
  onOpenVipModal,
  onOpenAdminModal,
  onNavigateWatchlist,
  isAdmin,
}) => {
  if (!isOpen) return null;

  const isGuest = !user || !user.userId || user.userId.startsWith('guest_');
  const isVip = !!user?.isVip;
  const currentPlan = plans.find((p) => p.id === user?.planId || p.name === user?.planName);

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Lifetime Access';
    if (isoString === 'lifetime') return 'Never (Permanent Lifetime)';
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <AnimatePresence>
      <div 
        id="user-profile-modal-overlay"
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl bg-neutral-900/95 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Header Backdrop */}
          <div className="relative h-28 sm:h-32 bg-gradient-to-r from-neutral-900 via-rose-950/40 to-neutral-900 border-b border-neutral-800/80 flex items-end px-6 pb-4">
            <div className="absolute top-4 right-4 z-10">
              <button
                id="close-user-profile-modal-btn"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-neutral-950/80 hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-neutral-700/60"
                aria-label="Close Profile Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Glowing Accent */}
            <div className="absolute top-0 left-1/4 w-48 h-12 bg-rose-600/20 blur-2xl rounded-full pointer-events-none" />
            {isVip && (
              <div className="absolute top-0 right-1/4 w-48 h-12 bg-amber-500/20 blur-2xl rounded-full pointer-events-none" />
            )}
          </div>

          {/* Profile Card Body */}
          <div className="px-5 sm:px-7 pb-6 sm:pb-7">
            {/* Avatar & Title Row */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-6">
              <div className="flex items-end gap-4">
                <div className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-neutral-950 border-2 ${
                  isVip ? 'border-amber-500 shadow-lg shadow-amber-500/25' : 'border-neutral-700'
                } shrink-0`}>
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.userName || 'User Profile'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-neutral-800 text-white font-black text-2xl flex items-center justify-center uppercase">
                      {(user?.userName || 'A')[0]}
                    </div>
                  )}

                  {isVip && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-full flex items-center justify-center border-2 border-neutral-950 shadow-md">
                      <Crown className="w-3.5 h-3.5 text-neutral-950 fill-neutral-950" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-black text-white truncate">
                      {user?.userName || 'Anime Explorer'}
                    </h2>
                    {isAdmin && (
                      <span className="px-2 py-0.5 bg-rose-600/20 border border-rose-500/40 text-rose-400 font-mono text-[10px] font-bold rounded-md uppercase">
                        Super Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-400 truncate flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    <span>{user?.email || (isGuest ? 'Guest Mode (Not Signed In)' : 'No email attached')}</span>
                  </p>
                </div>
              </div>

              {/* Status Pill */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border ${
                  isVip 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                    : 'bg-neutral-800/80 border-neutral-700 text-neutral-300'
                }`}>
                  {isVip ? (
                    <>
                      <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>{user?.planName || 'VIP MEMBER'}</span>
                    </>
                  ) : (
                    <>
                      <UserIcon className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Free Explorer</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Account Details & Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <div className="p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-2xl">
                <div className="text-[11px] font-mono text-neutral-400 uppercase flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
                  <span>Account Identifier</span>
                </div>
                <div className="text-xs font-mono font-bold text-neutral-200 truncate">
                  {user?.userId || 'guest_session'}
                </div>
              </div>

              <div className="p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-2xl">
                <div className="text-[11px] font-mono text-neutral-400 uppercase flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span>Membership Expiry</span>
                </div>
                <div className="text-xs font-bold text-neutral-200">
                  {isVip ? formatDate(user?.expiresAt) : 'Free Tier (No Expiry)'}
                </div>
              </div>
            </div>

            {/* VIP Status & Perks Box */}
            <div className={`p-4 rounded-2xl border mb-5 ${
              isVip
                ? 'bg-amber-500/5 border-amber-500/20'
                : 'bg-neutral-950/40 border-neutral-800'
            }`}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-4 h-4 ${isVip ? 'text-amber-400' : 'text-neutral-400'}`} />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200 font-mono">
                    {isVip ? 'Active VIP Privileges' : 'Unlock Premium Features'}
                  </h3>
                </div>
                {!isVip && (
                  <button
                    id="user-profile-upgrade-btn"
                    onClick={() => {
                      onClose();
                      onOpenVipModal();
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs rounded-xl shadow-md cursor-pointer transition-all"
                  >
                    <Crown className="w-3 h-3 fill-neutral-950" />
                    <span>Go VIP</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isVip ? 'text-amber-400' : 'text-neutral-600'}`} />
                  <span className={isVip ? 'text-neutral-200' : 'text-neutral-500'}>100% Zero Video Ad Interruptions</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isVip ? 'text-amber-400' : 'text-neutral-600'}`} />
                  <span className={isVip ? 'text-neutral-200' : 'text-neutral-500'}>Ultra HD 4K / 1080p Stream Servers</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isVip ? 'text-amber-400' : 'text-neutral-600'}`} />
                  <span className={isVip ? 'text-neutral-200' : 'text-neutral-500'}>High-Speed Tokyo CDN Route</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isVip ? 'text-amber-400' : 'text-neutral-600'}`} />
                  <span className={isVip ? 'text-neutral-200' : 'text-neutral-500'}>VIP Golden Crown Profile Badge</span>
                </div>
              </div>
            </div>

            {/* Action Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-neutral-800/80">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  id="profile-view-watchlist-btn"
                  onClick={() => {
                    onClose();
                    onNavigateWatchlist();
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700/60 hover:border-neutral-600 text-neutral-200 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  <Bookmark className="w-3.5 h-3.5 text-rose-400" />
                  <span>My Watchlist</span>
                </button>

                {isAdmin && onOpenAdminModal && (
                  <button
                    id="profile-admin-panel-btn"
                    onClick={() => {
                      onClose();
                      onOpenAdminModal();
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30 text-rose-300 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
                    <span>Admin Panel</span>
                  </button>
                )}
              </div>

              {!isGuest ? (
                <button
                  id="profile-logout-btn"
                  onClick={async () => {
                    onClose();
                    await logoutUser();
                  }}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-neutral-950 hover:bg-rose-950/40 text-neutral-400 hover:text-rose-300 border border-neutral-800 hover:border-rose-900/50 text-xs font-bold rounded-xl cursor-pointer transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <button
                  id="profile-close-btn"
                  onClick={onClose}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
