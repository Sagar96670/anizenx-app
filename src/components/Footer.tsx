import React, { useState, useEffect } from 'react';
import { Flame, Crown, Sparkles } from 'lucide-react';
import { isVipActive, subscribeToVip } from '../services/vipStore';
import { isMembershipSystemEnabled, subscribeToAdminState } from '../services/adminStore';

interface FooterProps {
  onOpenVipModal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenVipModal,
}) => {
  const [vipActive, setVipActive] = useState<boolean>(isVipActive());
  const [membershipEnabled, setMembershipEnabled] = useState<boolean>(isMembershipSystemEnabled());

  useEffect(() => {
    const unsubVip = subscribeToVip((u) => setVipActive(u.isVip));
    const unsubAdmin = subscribeToAdminState((s) => setMembershipEnabled(s.isMembershipSystemEnabled ?? true));
    return () => {
      unsubVip();
      unsubAdmin();
    };
  }, []);

  return (
    <footer className="w-full bg-neutral-950 border-t border-neutral-800/80 text-neutral-400 text-xs py-8 sm:py-10 mt-12 sm:mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-md">
              <Flame className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-white">
                ANIZEN<span className="text-rose-500">X</span> HUB
              </span>
              <p className="text-[11px] text-neutral-500">
                Premium High-Definition Anime Streaming Platform
              </p>
            </div>
          </div>

          {/* Action Links */}
          <div className="flex items-center gap-3">
            {membershipEnabled && onOpenVipModal && (
              <button
                id="footer-vip-btn"
                onClick={onOpenVipModal}
                className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  vipActive
                    ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                    : 'bg-gradient-to-r from-amber-500/10 to-rose-500/10 hover:from-amber-500/20 hover:to-rose-500/20 border-amber-500/40 text-amber-300'
                }`}
              >
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>{vipActive ? 'VIP Member' : 'Upgrade to VIP'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-neutral-900 text-[11px] text-neutral-500">
          <p>© {new Date().getFullYear()} AnizenX Hub. All rights reserved. Anime data provided by open anime databases.</p>
          <div className="flex items-center gap-4 text-neutral-400">
            <span>HD & 4K Streaming</span>
            <span>•</span>
            <span>Multi-Language Sub & Dub</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

