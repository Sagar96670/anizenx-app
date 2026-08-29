import React from 'react';
import { X, Play, Loader2 } from 'lucide-react';
import { AnimeItem } from '../types/anime';

interface PlayerSkeletonModalProps {
  anime: AnimeItem | null;
  onClose: () => void;
}

export const PlayerSkeletonModal: React.FC<PlayerSkeletonModalProps> = ({
  anime,
  onClose,
}) => {
  return (
    <div
      id="video-player-skeleton-modal"
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fadeIn select-none"
    >
      <div className="relative w-full max-w-6xl bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
              <Play className="w-4 h-4 fill-current animate-pulse" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate flex items-center gap-2">
                {anime?.titleEnglish || anime?.title || 'Loading Player...'}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse font-medium">
                  Connecting...
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400 truncate">
                Preparing high-speed video player & stream servers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with Skeleton Placeholders */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Main Video Frame Skeleton */}
          <div className="relative w-full aspect-video bg-neutral-950 rounded-xl overflow-hidden border border-neutral-800 flex flex-col items-center justify-center shadow-inner group">
            {/* Animated Shimmer Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neutral-800/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />

            <div className="relative z-10 flex flex-col items-center gap-3 text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-neutral-900/90 border border-neutral-700/80 flex items-center justify-center text-rose-500 shadow-xl">
                <Loader2 className="w-7 h-7 animate-spin text-rose-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-neutral-200">
                  Initializing Video Player
                </p>
                <p className="text-xs text-neutral-500 max-w-sm">
                  Connecting to streaming nodes and setting up controls...
                </p>
              </div>
            </div>

            {/* Bottom player control bar skeleton */}
            <div className="absolute bottom-0 inset-x-0 h-10 bg-neutral-950/80 border-t border-neutral-800/60 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-neutral-800 animate-pulse" />
                <div className="w-16 h-2 rounded bg-neutral-800 animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-2 rounded bg-neutral-800 animate-pulse" />
                <div className="w-4 h-4 rounded bg-neutral-800 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Secondary Controls Skeleton (Servers & Episode row) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-3">
              <div className="h-4 w-32 bg-neutral-800 rounded animate-pulse" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-10 bg-neutral-850 border border-neutral-800 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="h-4 w-24 bg-neutral-800 rounded animate-pulse" />
              <div className="h-10 bg-neutral-850 border border-neutral-800 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
