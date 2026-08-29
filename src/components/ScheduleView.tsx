import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Star, Play, Sparkles } from 'lucide-react';
import { AnimeItem } from '../types/anime';
import { getAnimeSchedules } from '../services/animeApi';
import { AnimeCard } from './AnimeCard';

interface ScheduleViewProps {
  onSelectAnime: (anime: AnimeItem) => void;
  onWatchTrailer: (anime: AnimeItem) => void;
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  onSelectAnime,
  onWatchTrailer,
}) => {
  const currentDayIndex = new Date().getDay();
  // Map 0 (Sunday) to 'sunday', 1 (Monday) to 'monday', etc.
  const initialDay =
    currentDayIndex === 0
      ? 'sunday'
      : DAYS[currentDayIndex - 1]?.key || 'monday';

  const [selectedDay, setSelectedDay] = useState<string>(initialDay);
  const [scheduleList, setScheduleList] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getAnimeSchedules(selectedDay)
      .then((data) => {
        if (isMounted) {
          setScheduleList(data);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDay]);

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5 sm:space-y-6 animate-fadeIn w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-neutral-800 pb-4 sm:pb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5 sm:gap-3">
          <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-rose-500" />
          Weekly Anime Release Schedule
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1">
          Discover which episodes air on each day of the week this broadcast season.
        </p>
      </div>

      {/* Day Selector Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-none max-w-full">
        {DAYS.map((day) => {
          const isSelected = selectedDay === day.key;
          return (
            <button
              key={day.key}
              id={`schedule-day-${day.key}`}
              onClick={() => setSelectedDay(day.key)}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              {day.label}
            </button>
          );
        })}
      </div>

      {/* Airing Anime List */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 animate-pulse w-full">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-neutral-900 rounded-xl" />
          ))}
        </div>
      ) : scheduleList.length === 0 ? (
        <div className="py-16 sm:py-20 text-center text-neutral-500 bg-neutral-900/40 rounded-2xl border border-neutral-800 p-6">
          <Clock className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 text-neutral-600" />
          <p className="text-xs sm:text-sm">No scheduled releases found for this day.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 w-full">
          {scheduleList.map((anime) => (
            <AnimeCard
              key={anime.id}
              anime={anime}
              onClick={onSelectAnime}
              onWatchTrailer={onWatchTrailer}
            />
          ))}
        </div>
      )}
    </div>
  );
};
