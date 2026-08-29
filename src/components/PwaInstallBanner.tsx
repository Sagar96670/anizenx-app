import React, { useState, useEffect } from 'react';
import { Download, Sparkles, X, Smartphone, Check, ArrowRight } from 'lucide-react';
import { isPwaInstallable, isPwaInstalled, promptPwaInstall, subscribeToPwaState } from '../services/pwaService';

interface PwaInstallBannerProps {
  variant?: 'floating' | 'inline' | 'button' | 'section';
  className?: string;
  onOpenVip?: () => void;
}

export const PwaInstallBanner: React.FC<PwaInstallBannerProps> = ({
  variant = 'section',
  className = '',
  onOpenVip,
}) => {
  const [canInstall, setCanInstall] = useState<boolean>(isPwaInstallable());
  const [isInstalled, setIsInstalled] = useState<boolean>(isPwaInstalled());
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);

  useEffect(() => {
    const unsub = subscribeToPwaState(() => {
      setCanInstall(isPwaInstallable());
      setIsInstalled(isPwaInstalled());
    });
    return unsub;
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    const res = await promptPwaInstall();
    setIsInstalling(false);
    if (res.outcome === 'accepted') {
      setIsInstalled(true);
    }
  };

  if (isInstalled || dismissed || !canInstall) return null;

  if (variant === 'button') {
    return (
      <button
        onClick={handleInstall}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600/30 to-amber-600/30 hover:from-rose-600/50 hover:to-amber-600/50 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-sm ${className}`}
        title="Install AnizenX Native App for offline support"
      >
        <Smartphone className="w-3.5 h-3.5 text-rose-400" />
        <span>Install App</span>
      </button>
    );
  }

  // Non-overlaying inline or section banner (Does not block or float over main content on mobile)
  if (variant === 'section' || variant === 'inline') {
    return (
      <aside
        aria-label="PWA install prompt"
        className={`w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-3 pb-1 ${className}`}
      >
        <div className="relative overflow-hidden p-3 sm:p-4 bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-rose-950/40 border border-neutral-800/90 hover:border-rose-500/40 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-lg transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-rose-600/20">
              <Download className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                  Install AnizenX App
                </h4>
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono text-[9px] font-bold">
                  PWA & OFFLINE
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 truncate sm:whitespace-normal mt-0.5">
                Fast native experience, home-screen shortcut & background caching.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{isInstalling ? 'Installing...' : 'Install App'}</span>
            </button>

            <button
              onClick={() => setDismissed(true)}
              className="p-2 text-neutral-500 hover:text-neutral-300 rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Dismiss"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // Floating variant (Repositioned to top-right on desktop or given proper bottom clearance so it never covers mobile controls)
  return (
    <aside
      aria-label="PWA install prompt"
      className={`fixed bottom-20 right-3 sm:bottom-20 sm:right-4 z-30 max-w-sm w-[calc(100%-1.5rem)] sm:w-auto bg-neutral-900/95 border border-rose-500/40 rounded-2xl p-3 sm:p-3.5 shadow-2xl backdrop-blur-xl text-neutral-100 animate-slideUp flex items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-600/20">
          <Download className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0 truncate">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <span>Install AnizenX</span>
            <span className="px-1.5 py-0.2 rounded bg-rose-500 text-white font-mono text-[9px] font-black">
              PWA
            </span>
          </h4>
          <p className="text-[10px] sm:text-[11px] text-neutral-400 truncate">
            Ultra-fast offline mode & 4K playback
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleInstall}
          disabled={isInstalling}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95"
        >
          {isInstalling ? 'Installing...' : 'Install'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 text-neutral-500 hover:text-white rounded-lg transition-colors cursor-pointer"
          title="Dismiss"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};

