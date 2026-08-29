import React, { useState, useEffect, useRef } from 'react';
import { Film } from 'lucide-react';
import { getOptimizedTmdbImageUrl } from '../services/tmdbApi';

interface AnimePosterImageProps {
  src?: string;
  alt: string;
  title?: string;
  className?: string;
  containerClassName?: string;
  size?: 'w185' | 'w300' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original';
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'auto' | 'sync';
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
}

// High quality default anime logo SVG data URL fallback (shows stylized logo badge instead of empty box)
export const DEFAULT_ANIME_FALLBACK_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600" fill="none">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#090d16" />
        <stop offset="50%" stop-color="#1e1b4b" />
        <stop offset="100%" stop-color="#0b0f19" />
      </linearGradient>
      <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#6366f1" />
        <stop offset="100%" stop-color="#a855f7" />
      </linearGradient>
      <linearGradient id="badge" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ec4899" />
        <stop offset="100%" stop-color="#8b5cf6" />
      </linearGradient>
    </defs>
    <rect width="400" height="600" fill="url(#bg)" />
    <circle cx="200" cy="230" r="130" fill="#ffffff" fill-opacity="0.03" />
    <circle cx="200" cy="230" r="95" stroke="url(#accent)" stroke-width="2" stroke-opacity="0.25" stroke-dasharray="6 6" />
    
    <g transform="translate(136, 166)">
      <rect width="128" height="128" rx="28" fill="url(#accent)" fill-opacity="0.18" stroke="url(#accent)" stroke-width="2" />
      <path d="M44 34L88 64L44 94V34Z" fill="url(#accent)" />
      <path d="M88 38L98 32M88 90L98 96" stroke="#a855f7" stroke-width="3" stroke-linecap="round" />
    </g>

    <text x="200" y="335" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="800" letter-spacing="3">ANIZEN STREAMS</text>
    <text x="200" y="360" text-anchor="middle" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500" letter-spacing="1">ULTRA HD ANIME HUB</text>

    <rect x="130" y="390" width="140" height="28" rx="14" fill="url(#badge)" />
    <text x="200" y="408" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" letter-spacing="1">HD AVAILABLE</text>
  </svg>`
)}`;

export const AnimePosterImage: React.FC<AnimePosterImageProps> = ({
  src,
  alt,
  title,
  className = '',
  containerClassName = '',
  size = 'w342',
  loading = 'lazy',
  decoding = 'async',
  referrerPolicy = 'no-referrer',
}) => {
  const [retryCount, setRetryCount] = useState<number>(0);
  const [hasFailedAllRetries, setHasFailedAllRetries] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const displayTitle = title || alt || 'Anime';
  const primaryOptimizedSrc = src ? getOptimizedTmdbImageUrl(src, size) : undefined;

  useEffect(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
    }
    setRetryCount(0);
    setHasFailedAllRetries(false);
    setIsLoaded(false);

    if (primaryOptimizedSrc) {
      setCurrentSrc(primaryOptimizedSrc);
    } else {
      setHasFailedAllRetries(true);
      setCurrentSrc(DEFAULT_ANIME_FALLBACK_IMAGE);
    }
  }, [src, size]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  const handleImageError = () => {
    if (!hasFailedAllRetries && primaryOptimizedSrc && retryCount < 3) {
      const nextRetry = retryCount + 1;
      setRetryCount(nextRetry);

      // Trigger automatic retry after 1 second (1000ms) with cache-busting query
      retryTimerRef.current = setTimeout(() => {
        const separator = primaryOptimizedSrc.includes('?') ? '&' : '?';
        const retryUrl = `${primaryOptimizedSrc}${separator}_retry=${nextRetry}_${Date.now()}`;
        setCurrentSrc(retryUrl);
      }, 1000);
    } else {
      // All 3 retries exhausted or invalid primary URL -> fallback to high quality default anime logo
      setHasFailedAllRetries(true);
      setCurrentSrc(DEFAULT_ANIME_FALLBACK_IMAGE);
      setIsLoaded(true);
    }
  };

  const isFallback = hasFailedAllRetries || !primaryOptimizedSrc;

  return (
    <div className={`relative w-full h-full overflow-hidden bg-neutral-950 ${containerClassName}`}>
      {/* Skeleton Shimmer Loader during loading & retries */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-neutral-900/90 flex flex-col items-center justify-center overflow-hidden z-10">
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent animate-shimmer" />
          <Film className="w-7 h-7 text-neutral-600 animate-pulse mb-1" />
          {retryCount > 0 && (
            <span className="text-[10px] font-mono text-indigo-400 font-medium">
              Retrying ({retryCount}/3)...
            </span>
          )}
        </div>
      )}

      {/* Main Image with WebP support and no-referrer attribute */}
      <picture className="w-full h-full">
        {!isFallback && currentSrc && currentSrc.includes('image.tmdb.org') && (
          <source srcSet={currentSrc} type="image/webp" />
        )}
        <img
          src={currentSrc || DEFAULT_ANIME_FALLBACK_IMAGE}
          alt={alt}
          loading={loading}
          decoding={decoding}
          referrerPolicy={referrerPolicy}
          onLoad={() => setIsLoaded(true)}
          onError={handleImageError}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
        />
      </picture>

      {/* Fallback Overlay text when defaulting to fallback logo */}
      {isFallback && isLoaded && (
        <div className="absolute inset-x-0 bottom-0 p-3.5 text-center bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-transparent z-10">
          <p className="text-xs font-bold text-white line-clamp-2 drop-shadow-md">{displayTitle}</p>
        </div>
      )}
    </div>
  );
};
