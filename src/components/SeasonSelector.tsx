import React, { useState, useRef, useEffect } from 'react';
import { Layers, ChevronDown, Check, Sparkles, CheckCircle2, Tv } from 'lucide-react';

export interface SeasonSelectorProps {
  availableSeasons: number[];
  selectedSeason: number | 'all';
  onSelectSeason: (season: number | 'all') => void;
  seasonEpisodeCounts?: Record<number, number>;
  totalEpisodesCount?: number;
  seasonWatchedCounts?: Record<number, number>;
  totalWatchedCount?: number;
  showAllOption?: boolean;
  className?: string;
  variant?: 'full' | 'compact';
}

export const SeasonSelector: React.FC<SeasonSelectorProps> = ({
  availableSeasons = [1],
  selectedSeason,
  onSelectSeason,
  seasonEpisodeCounts = {},
  totalEpisodesCount = 0,
  seasonWatchedCounts = {},
  totalWatchedCount = 0,
  showAllOption = true,
  className = '',
  variant = 'full',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const seasonsList = availableSeasons.length > 0 ? availableSeasons : [1];
  const hasMultipleSeasons = seasonsList.length > 1;

  // Selected label computation
  const selectedLabel =
    selectedSeason === 'all'
      ? 'All Seasons'
      : `Season ${selectedSeason}`;

  const currentSeasonEpCount =
    selectedSeason === 'all'
      ? totalEpisodesCount ||
        Object.values(seasonEpisodeCounts).reduce(
          (a: number, b: number) => Number(a) + Number(b),
          0
        )
      : seasonEpisodeCounts[selectedSeason] || 12;

  const currentSeasonWatchedCount =
    selectedSeason === 'all'
      ? totalWatchedCount ||
        Object.values(seasonWatchedCounts).reduce(
          (a: number, b: number) => Number(a) + Number(b),
          0
        )
      : seasonWatchedCounts[selectedSeason] || 0;

  const isCurrentSeasonCompleted =
    currentSeasonEpCount > 0 && currentSeasonWatchedCount >= currentSeasonEpCount;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 w-full ${className}`}>
      {/* Left: Prominent Season Dropdown Button */}
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <div className="flex items-center gap-2">
          <button
            id="season-selector-dropdown-btn"
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center justify-between gap-2.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer shadow-sm ${
              isOpen
                ? 'bg-neutral-800 border-rose-500 text-white ring-2 ring-rose-500/20'
                : 'bg-neutral-900/90 hover:bg-neutral-800/90 border-neutral-700/80 text-neutral-100 hover:border-neutral-600'
            }`}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-rose-500/20 text-rose-400">
                <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="font-extrabold tracking-wide text-white">
                {selectedLabel}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700">
                {currentSeasonEpCount} {currentSeasonEpCount === 1 ? 'Ep' : 'Episodes'}
              </span>
              {currentSeasonWatchedCount > 0 && (
                <span
                  className={`hidden xs:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    isCurrentSeasonCompleted
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  {currentSeasonWatchedCount}/{currentSeasonEpCount}
                </span>
              )}
            </div>

            <ChevronDown
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400 transition-transform duration-200 ml-1 ${
                isOpen ? 'rotate-180 text-rose-400' : ''
              }`}
            />
          </button>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            id="season-selector-menu"
            className="absolute left-0 mt-2 w-64 sm:w-72 bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn py-1.5"
            role="listbox"
          >
            <div className="px-3.5 py-2 border-b border-neutral-800 flex items-center justify-between text-[11px] font-bold text-neutral-400">
              <span className="flex items-center gap-1.5 text-neutral-300">
                <Tv className="w-3 h-3 text-rose-400" />
                Select Season ({seasonsList.length} Available)
              </span>
              {totalEpisodesCount > 0 && (
                <span className="text-neutral-500 font-mono">{totalEpisodesCount} Total Eps</span>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto py-1 scrollbar-thin">
              {/* Option: All Seasons */}
              {showAllOption && hasMultipleSeasons && (
                <button
                  id="season-option-all"
                  role="option"
                  aria-selected={selectedSeason === 'all'}
                  onClick={() => {
                    onSelectSeason('all');
                    setIsOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    selectedSeason === 'all'
                      ? 'bg-rose-600/20 text-rose-300 font-bold border-l-4 border-rose-500'
                      : 'text-neutral-200 hover:bg-neutral-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className={`w-3.5 h-3.5 ${selectedSeason === 'all' ? 'text-rose-400' : 'text-neutral-400'}`} />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span>All Seasons</span>
                        <span className="text-[10px] text-neutral-400 font-normal">
                          (Complete Series)
                        </span>
                      </div>
                      {totalWatchedCount > 0 && (
                        <p className="text-[10px] text-neutral-400">
                          {totalWatchedCount} of {totalEpisodesCount} episodes watched
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-800 text-neutral-300">
                      {totalEpisodesCount ||
                        Object.values(seasonEpisodeCounts).reduce(
                          (a: number, b: number) => Number(a) + Number(b),
                          0
                        )}{' '}
                      Eps
                    </span>
                    {selectedSeason === 'all' && (
                      <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    )}
                  </div>
                </button>
              )}

              {/* Specific Seasons */}
              {seasonsList.map((seasonNum) => {
                const isSelected = selectedSeason === seasonNum;
                const epCount = seasonEpisodeCounts[seasonNum] || 12;
                const watchedCount = seasonWatchedCounts[seasonNum] || 0;
                const isCompleted = epCount > 0 && watchedCount >= epCount;
                const percent = epCount > 0 ? Math.round((watchedCount / epCount) * 100) : 0;

                return (
                  <button
                    key={seasonNum}
                    id={`season-option-${seasonNum}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelectSeason(seasonNum);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600/20 text-rose-300 font-bold border-l-4 border-rose-500'
                        : 'text-neutral-200 hover:bg-neutral-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-extrabold ${
                          isSelected
                            ? 'bg-rose-600 text-white'
                            : isCompleted
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        S{seasonNum}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span>Season {seasonNum}</span>
                          {isCompleted && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                              Completed
                            </span>
                          )}
                        </div>
                        {watchedCount > 0 && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-14 bg-neutral-800 h-1 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${isCompleted ? 'bg-emerald-400' : 'bg-rose-500'}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              {watchedCount}/{epCount} ({percent}%)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-800 text-neutral-300">
                        {epCount} Eps
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right: Quick Tab Pills for Fast 1-Click Season Switching */}
      {hasMultipleSeasons && variant === 'full' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          {showAllOption && (
            <button
              id="season-tab-all"
              type="button"
              onClick={() => onSelectSeason('all')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedSeason === 'all'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              All
            </button>
          )}

          {seasonsList.map((s) => {
            const isSelected = selectedSeason === s;
            const epCount = seasonEpisodeCounts[s];
            return (
              <button
                key={s}
                id={`season-tab-${s}`}
                type="button"
                onClick={() => onSelectSeason(s)}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                }`}
              >
                <span>Season {s}</span>
                {epCount !== undefined && (
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                      isSelected ? 'bg-rose-700 text-rose-100' : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {epCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
