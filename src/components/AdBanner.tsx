import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, Sparkles, ShieldCheck, X } from 'lucide-react';
import { shouldDisplayAd, getAdEngineSettings, subscribeToAdminState, isMembershipSystemEnabled } from '../services/adminStore';
import { isVipActive, subscribeToVip } from '../services/vipStore';

interface AdScriptRendererProps {
  htmlCode?: string;
  className?: string;
}

const AdScriptRenderer: React.FC<AdScriptRendererProps> = ({ htmlCode, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !htmlCode) return;
    const container = containerRef.current;
    container.innerHTML = htmlCode;

    // Execute any script tags embedded in htmlCode
    const scripts = container.querySelectorAll('script');
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr: any) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.textContent = oldScript.textContent;
      }
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }, [htmlCode]);

  return <div ref={containerRef} className={`ad-script-container w-full overflow-x-auto ${className}`} />;
};

interface AdBannerProps {
  placement: 'header' | 'player' | 'sidebar' | 'feed' | 'detail';
  onOpenVipModal?: () => void;
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  placement,
  onOpenVipModal,
  className = '',
}) => {
  const [isVip, setIsVip] = useState<boolean>(isVipActive());
  const [adSettings, setAdSettings] = useState(getAdEngineSettings());
  const [membershipEnabled, setMembershipEnabled] = useState<boolean>(isMembershipSystemEnabled());
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    const unsubVip = subscribeToVip((user) => setIsVip(user.isVip));
    const unsubAdmin = subscribeToAdminState((state) => {
      setAdSettings(state.ads);
      setMembershipEnabled(state.isMembershipSystemEnabled ?? true);
    });
    return () => {
      unsubVip();
      unsubAdmin();
    };
  }, []);

  // VIP users see ZERO ads site-wide
  if (isVip || dismissed) {
    return null;
  }

  const shouldShow = shouldDisplayAd(placement);
  if (!shouldShow) {
    return null;
  }

  const config =
    placement === 'header' || placement === 'feed'
      ? adSettings.headerBanner
      : placement === 'player'
      ? adSettings.playerBanner
      : adSettings.sidebarBanner;

  if (!config || !config.enabled) {
    return null;
  }

  // If customHtml is provided (e.g. HilltopAds / third-party script/HTML code)
  if (config.customHtml) {
    return (
      <div
        className={`ad-container relative overflow-visible pt-[12px] pr-[12px] rounded-xl border border-neutral-800 bg-neutral-900/90 shadow-lg transition-all ${className}`}
        data-ad-container={placement}
      >
        <button
          onClick={() => setDismissed(true)}
          className="ad-close-btn absolute top-[8px] right-[8px] z-50 p-1.5 rounded-full bg-neutral-950/95 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all cursor-pointer border border-neutral-700/80 shadow-md active:scale-95 flex items-center justify-center shrink-0"
          title="Dismiss Ad"
          aria-label="Dismiss Ad"
        >
          <X className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>

        <div className="rounded-lg overflow-hidden border border-neutral-800/60 bg-neutral-950/60">
          <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-950/90 border-b border-neutral-800/60 text-[10px] text-neutral-400 pr-10 sm:pr-12">
            <div className="flex items-center gap-1.5 font-mono min-w-0">
              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold uppercase tracking-wider text-[9px] shrink-0">
                {config.badgeText || 'ANIZENX AD NETWORK'}
              </span>
              <span className="truncate max-w-[140px] sm:max-w-xs text-neutral-400 font-medium">
                Third-Party Ad Script
              </span>
            </div>

            {membershipEnabled && onOpenVipModal && (
              <button
                onClick={onOpenVipModal}
                className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-bold transition-colors cursor-pointer shrink-0"
              >
                <Sparkles className="w-3 h-3" />
                <span className="hidden xs:inline">Hide Ads with VIP</span>
                <span className="xs:hidden">VIP</span>
              </button>
            )}
          </div>

          <div className="p-3 sm:p-4 bg-neutral-950/80 flex items-center justify-center min-h-[90px]">
            <AdScriptRenderer htmlCode={config.customHtml} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`ad-container relative overflow-visible pt-[12px] pr-[12px] rounded-xl border border-neutral-800 bg-neutral-900/90 shadow-lg transition-all ${className}`}
      data-ad-container={placement}
    >
      {/* Repositioned Close ('X') button: position: absolute; top: 8px; right: 8px; z-index: 50; */}
      <button
        onClick={() => setDismissed(true)}
        className="ad-close-btn absolute top-[8px] right-[8px] z-50 p-1.5 rounded-full bg-neutral-950/95 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all cursor-pointer border border-neutral-700/80 shadow-md active:scale-95 flex items-center justify-center shrink-0"
        title="Dismiss Ad"
        aria-label="Dismiss Ad"
      >
        <X className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      <div className="rounded-lg overflow-hidden border border-neutral-800/60 bg-neutral-950/60">
        {/* Top micro bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-950/90 border-b border-neutral-800/60 text-[10px] text-neutral-400 pr-10 sm:pr-12">
          <div className="flex items-center gap-1.5 font-mono min-w-0">
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold uppercase tracking-wider text-[9px] shrink-0">
              {config.badgeText || 'SPONSORED'}
            </span>
            <span className="truncate max-w-[140px] sm:max-w-xs text-neutral-400 font-medium">
              AnizenX Ad Network
            </span>
          </div>

          {membershipEnabled && onOpenVipModal && (
            <button
              onClick={onOpenVipModal}
              className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-bold transition-colors cursor-pointer shrink-0"
            >
              <Sparkles className="w-3 h-3" />
              <span className="hidden xs:inline">Hide Ads with VIP</span>
              <span className="xs:hidden">VIP</span>
            </button>
          )}
        </div>

        {/* Banner Content */}
        <a
          href={config.targetUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="group block relative p-3 sm:p-4 hover:bg-neutral-850/80 transition-colors"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            {config.imageUrl && (
              <div className="w-full sm:w-44 h-32 sm:h-20 rounded-lg overflow-hidden shrink-0 bg-neutral-950 border border-neutral-800">
                <img
                  src={config.imageUrl}
                  alt={config.title}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}

            <div className="flex-1 min-w-0 text-left w-full">
              <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-rose-400 transition-colors line-clamp-2 leading-snug">
                {config.title}
              </h4>
              {config.subtitle && (
                <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                  {config.subtitle}
                </p>
              )}
              <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-400 group-hover:text-rose-300">
                <span>Learn More</span>
                <ExternalLink className="w-3 h-3" />
              </div>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
};

