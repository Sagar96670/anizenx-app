import React, { useEffect, useRef, useState } from 'react';
import { resolveVastTag, VastParsedAd, fireTrackingBeacons } from '../services/vastParser';
import { Loader2, ExternalLink, SkipForward, Sparkles, Volume2, VolumeX } from 'lucide-react';

interface BaseVastAdPlayerProps {
  config: {
    vastUrl?: string;
    mediaUrl?: string;
    durationSec?: number;
    skipDelaySec?: number;
    title?: string;
    sponsorName?: string;
    ctaText?: string;
    ctaLink?: string;
    mediaType?: 'video' | 'image';
  };
  adTypeLabel: string;
  badgeBgColor?: string;
  onAdCompleted: () => void;
  onOpenVipModal: () => void;
}

export const BaseVastAdPlayer: React.FC<BaseVastAdPlayerProps> = ({
  config,
  adTypeLabel,
  badgeBgColor = 'bg-amber-500/20 text-amber-400',
  onAdCompleted,
  onOpenVipModal,
}) => {
  const [skipDelaySec, setSkipDelaySec] = useState<number>(() => Math.max(1, config.skipDelaySec ?? 5));
  const initialDuration = Math.max(skipDelaySec, config.durationSec ?? 15);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [parsedAd, setParsedAd] = useState<VastParsedAd | null>(null);
  const [adVideoUrl, setAdVideoUrl] = useState<string>('');
  const [totalDuration, setTotalDuration] = useState<number>(initialDuration);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [canSkip, setCanSkip] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [hasAdEnded, setHasAdEnded] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const onAdCompletedRef = useRef(onAdCompleted);
  onAdCompletedRef.current = onAdCompleted;

  // Track elapsed seconds ref to safely check in asynchronous callbacks
  const elapsedSecondsRef = useRef(0);
  elapsedSecondsRef.current = elapsedSeconds;

  const totalDurationRef = useRef(totalDuration);
  totalDurationRef.current = totalDuration;

  const skipDelaySecRef = useRef(skipDelaySec);
  skipDelaySecRef.current = skipDelaySec;

  // VAST 3.0 Quartile tracking state (fired once per ad impression)
  const quartilesFiredRef = useRef<{
    start?: boolean;
    q1?: boolean;
    mid?: boolean;
    q3?: boolean;
  }>({});

  // Cleanly complete ad and resume main video
  const finishAd = (reason: 'skipped' | 'completed' | 'fallback') => {
    if (hasAdEnded) return;
    setHasAdEnded(true);
    onAdCompletedRef.current();
  };

  // Load and resolve VAST 3.0 tag / media URL
  useEffect(() => {
    let isCancelled = false;
    const targetUrl = config.vastUrl || config.mediaUrl;

    if (!targetUrl) {
      setIsLoading(false);
      finishAd('fallback');
      return;
    }

    // Safety timeout: If VAST resolution completely hangs for 8s with no parsed media or fallback, clean up and resume
    const safetyTimeout = setTimeout(() => {
      if (!isCancelled && isLoading) {
        if (config.mediaUrl && config.mediaUrl !== adVideoUrl) {
          setAdVideoUrl(config.mediaUrl);
          setIsLoading(false);
        } else {
          console.warn(`[${adTypeLabel}] VAST load timeout. Destroying overlay and resuming main video.`);
          finishAd('fallback');
        }
      }
    }, 8000);

    async function loadAd() {
      try {
        if (targetUrl && targetUrl.trim().startsWith('<')) {
          // Embedded HTML/Script Tag snippet
          if (!isCancelled) {
            setIsLoading(false);
          }
          return;
        }

        const parsed = await resolveVastTag(targetUrl);
        if (isCancelled) return;

        if (parsed && parsed.mediaUrl) {
          setParsedAd(parsed);
          setAdVideoUrl(parsed.mediaUrl);

          if (parsed.durationSec && parsed.durationSec > 0) {
            setTotalDuration(parsed.durationSec);
          }
          if (parsed.skipDelaySec && parsed.skipDelaySec > 0) {
            setSkipDelaySec(parsed.skipDelaySec);
          }
          if (parsed.impressionUrls) {
            fireTrackingBeacons(parsed.impressionUrls);
          }
          setIsLoading(false);
        } else if (config.mediaUrl) {
          // Fallback to configured direct mediaUrl if VAST didn't yield a media file
          setAdVideoUrl(config.mediaUrl);
          setIsLoading(false);
        } else {
          console.warn(`[${adTypeLabel}] VAST returned no media file and no fallback configured. Resuming main video.`);
          finishAd('fallback');
        }
      } catch (err) {
        console.warn(`[${adTypeLabel}] VAST resolve notice:`, err);
        if (!isCancelled) {
          if (config.mediaUrl) {
            setAdVideoUrl(config.mediaUrl);
            setIsLoading(false);
          } else {
            finishAd('fallback');
          }
        }
      }
    }

    loadAd();

    return () => {
      isCancelled = true;
      clearTimeout(safetyTimeout);
    };
  }, [config.vastUrl, config.mediaUrl, config.durationSec, adTypeLabel]);

  // Secondary clock timer: Increments elapsed time every second and enforces skipDelaySec unlocking
  useEffect(() => {
    if (isLoading || hasAdEnded) return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (next >= skipDelaySecRef.current) {
          setCanSkip(true);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLoading, hasAdEnded]);

  // Video element metadata loaded
  const handleVideoLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration;
    if (!isNaN(dur) && dur > 0) {
      setTotalDuration(Math.ceil(dur));
    }
  };

  // Video element time update (syncs elapsed time and fires VAST 3.0 quartile beacons)
  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const dur = videoRef.current.duration || totalDurationRef.current;

    if (!isNaN(dur) && dur > 0) {
      setTotalDuration(Math.ceil(dur));
    }

    const currentSec = Math.floor(current);
    if (currentSec > elapsedSecondsRef.current) {
      setElapsedSeconds(currentSec);
    }

    // Unlock skip button once skipDelaySec is met or near end of video
    if (currentSec >= skipDelaySecRef.current || (dur > 0 && current >= dur - 0.5)) {
      setCanSkip(true);
    }

    // VAST 3.0 Quartile Tracking Beacon triggers
    if (parsedAd?.trackingEvents) {
      const events = parsedAd.trackingEvents;
      if (!quartilesFiredRef.current.start && current >= 0.2 && events.start) {
        quartilesFiredRef.current.start = true;
        fireTrackingBeacons(events.start);
      }
      if (!quartilesFiredRef.current.q1 && dur > 0 && current >= dur * 0.25 && events.firstQuartile) {
        quartilesFiredRef.current.q1 = true;
        fireTrackingBeacons(events.firstQuartile);
      }
      if (!quartilesFiredRef.current.mid && dur > 0 && current >= dur * 0.5 && events.midpoint) {
        quartilesFiredRef.current.mid = true;
        fireTrackingBeacons(events.midpoint);
      }
      if (!quartilesFiredRef.current.q3 && dur > 0 && current >= dur * 0.75 && events.thirdQuartile) {
        quartilesFiredRef.current.q3 = true;
        fireTrackingBeacons(events.thirdQuartile);
      }
    }
  };

  // Prevent early completion on premature HTML5 'ended' event
  const handleVideoEnded = () => {
    const video = videoRef.current;
    const current = video?.currentTime || 0;
    const dur = video?.duration || totalDurationRef.current;

    // Strict guard: Ignore premature ended event if fired before skipDelaySec or far from true duration
    if (elapsedSecondsRef.current < skipDelaySecRef.current || (dur > 2 && current < Math.max(1, dur - 1.5))) {
      console.warn(`[${adTypeLabel}] Ignored premature video ended event (elapsed: ${elapsedSecondsRef.current}s, current: ${current}s, dur: ${dur}s).`);
      video?.play().catch(() => {});
      return;
    }

    if (parsedAd?.trackingEvents?.complete) {
      fireTrackingBeacons(parsedAd.trackingEvents.complete);
    }
    finishAd('completed');
  };

  // Prevent unwanted video pauses (e.g. browser backgrounding or soft stalls) from closing ad prematurely
  const handleVideoPause = () => {
    if (hasAdEnded) return;
    const video = videoRef.current;
    if (video && video.currentTime < (video.duration || totalDurationRef.current) - 0.5) {
      video.play().catch(() => {});
    }
  };

  // Soft error handling on video stream (fallback to config.mediaUrl or clean recovery without freezing player)
  const handleVideoError = () => {
    console.warn(`[${adTypeLabel}] Video element encountered a playback/buffer notice.`);
    if (parsedAd?.errorUrls) {
      fireTrackingBeacons(parsedAd.errorUrls);
    }
    if (config.mediaUrl && adVideoUrl !== config.mediaUrl) {
      setAdVideoUrl(config.mediaUrl);
    } else if (canSkip) {
      // If error happens after skip is enabled, gracefully complete without freezing
      finishAd('fallback');
    }
  };

  // Strict user-initiated skip action
  const handleSkip = () => {
    if (!canSkip && elapsedSeconds < skipDelaySecRef.current) {
      console.warn(`[${adTypeLabel}] User attempted to skip before skipDelaySec (${skipDelaySecRef.current}s) elapsed.`);
      return;
    }

    if (parsedAd?.trackingEvents?.skip) {
      fireTrackingBeacons(parsedAd.trackingEvents.skip);
    }
    finishAd('skipped');
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);

      if (parsedAd?.trackingEvents) {
        if (nextMuted && parsedAd.trackingEvents.mute) {
          fireTrackingBeacons(parsedAd.trackingEvents.mute);
        } else if (!nextMuted && parsedAd.trackingEvents.unmute) {
          fireTrackingBeacons(parsedAd.trackingEvents.unmute);
        }
      }
    } else {
      setIsMuted(!isMuted);
    }
  };

  const handleAdClick = () => {
    const targetUrl = parsedAd?.clickThroughUrl || config.ctaLink;
    if (targetUrl) {
      if (parsedAd?.clickTrackingUrls) {
        fireTrackingBeacons(parsedAd.clickTrackingUrls);
      }
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const skipCountdownRemaining = Math.max(1, skipDelaySec - elapsedSeconds);
  const adPlaybackRemaining = Math.max(0, totalDuration - elapsedSeconds);

  return (
    <div className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center overflow-hidden animate-fadeIn select-none">
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/95 text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          <p className="text-xs font-medium tracking-wide">Loading {adTypeLabel} Stream...</p>
        </div>
      )}

      {/* Top Banner Header / Sponsored badge */}
      <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-50 flex items-center justify-between px-3 sm:px-4 py-2 bg-neutral-950/85 backdrop-blur-md rounded-xl border border-neutral-800/80 text-xs text-white shadow-xl">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px] shrink-0 ${badgeBgColor}`}>
            {adTypeLabel}
          </span>
          <span className="text-neutral-300 font-medium truncate text-[11px] sm:text-xs">
            {parsedAd?.title || config.title || 'AnizenX Premium Network Stream'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleToggleMute}
            className="p-1.5 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/60 transition-colors cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            id="ad-go-vip-btn"
            onClick={onOpenVipModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white rounded-lg font-bold text-[10px] sm:text-[11px] shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Go VIP</span>
          </button>
        </div>
      </div>

      {/* Video Ad Player or Fallback Iframe */}
      {adVideoUrl ? (
        <div className="relative w-full h-full flex items-center justify-center cursor-pointer" onClick={handleAdClick}>
          <video
            ref={videoRef}
            src={adVideoUrl}
            autoPlay
            playsInline
            muted={isMuted}
            onLoadedMetadata={handleVideoLoadedMetadata}
            onTimeUpdate={handleVideoTimeUpdate}
            onEnded={handleVideoEnded}
            onPause={handleVideoPause}
            onError={handleVideoError}
            className="w-full h-full object-contain bg-black pointer-events-none"
          />

          {(parsedAd?.clickThroughUrl || config.ctaLink) && (
            <div className="absolute bottom-16 left-4 sm:left-6 z-50 px-3.5 py-1.5 bg-neutral-900/90 hover:bg-neutral-800 backdrop-blur-md rounded-lg border border-neutral-700/80 text-xs text-white flex items-center gap-1.5 shadow-lg transition-all hover:scale-105">
              <span>{config.ctaText || 'Learn More'}</span>
              <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-full relative">
          {config.vastUrl && config.vastUrl.trim().startsWith('<') ? (
            <div
              className="w-full h-full flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: config.vastUrl }}
            />
          ) : (
            <iframe
              src={config.vastUrl || config.mediaUrl}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen; encrypted-media"
              onError={() => finishAd('fallback')}
            />
          )}
        </div>
      )}

      {/* Bottom Skip / Countdown Bar */}
      <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-50 flex items-center gap-3 bg-neutral-950/90 backdrop-blur-md px-3 sm:px-4 py-2 rounded-xl border border-neutral-800/80 text-xs text-white shadow-2xl">
        <span className="text-neutral-400 font-mono text-[11px] sm:text-xs">
          Ad playing: <strong className="text-white">{adPlaybackRemaining}s</strong>
        </span>

        {canSkip ? (
          <button
            id="vast-ad-skip-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleSkip();
            }}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 bg-white text-black hover:bg-neutral-200 font-black rounded-lg transition-all cursor-pointer shadow-lg active:scale-95 animate-fadeIn"
          >
            <span>Skip Ad</span>
            <SkipForward className="w-3.5 h-3.5 fill-current" />
          </button>
        ) : (
          <span className="px-3 sm:px-3.5 py-1.5 bg-neutral-800/90 text-neutral-400 rounded-lg font-medium select-none flex items-center gap-1.5 cursor-not-allowed text-[11px] sm:text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Skip in {skipCountdownRemaining}s</span>
          </span>
        )}
      </div>
    </div>
  );
};
