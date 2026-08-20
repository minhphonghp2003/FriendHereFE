"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { X, Play, Pause } from "lucide-react";
import { DownloadButton } from "@/components/common/download-button";
import type { MomentDto } from "@/types/moment";

interface V2MomentViewerProps {
  moment: MomentDto;
  /** Initial image index (for multi-image moments) */
  initialIndex?: number;
  /** Video playback position to resume from (seconds) */
  startTime?: number;
  onClose: () => void;
}

const formatTime = (s: number): string => {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};

/**
 * v2 fullscreen moment viewer — the SAME component used by the moment feed
 * reels and the userinfo moment list. Custom video player (center play/pause,
 * bottom seeker + time — no native controls), image carousel via side-tap
 * thirds, X to close, download beside it.
 */
export function V2MomentViewer({
  moment,
  initialIndex = 0,
  startTime = 0,
  onClose,
}: V2MomentViewerProps) {
  const [carouselIndex, setCarouselIndex] = useState(initialIndex);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Custom player state
  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Continue playback from the reel's position (if provided)
  useEffect(() => {
    const video = videoRef.current;
    if (video && startTime > 0) {
      const apply = () => {
        video.currentTime = startTime;
      };
      if (video.readyState >= 1) {
        apply();
      } else {
        video.addEventListener("loadedmetadata", apply, { once: true });
      }
    }
    
    // Dispatch event to hide scroll-to-top button when viewer opens
    window.dispatchEvent(new Event("v2:sheet-open"));
    
    // Disable body scroll when viewer is open
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.top = `-${window.scrollY}px`;
    
    const scrollY = window.scrollY;
    
    // Pause the video when the viewer closes
    return () => {
      const v = videoRef.current;
      if (v) v.pause();
      // Dispatch event to show scroll-to-top button when viewer closes
      window.dispatchEvent(new Event("v2:sheet-close"));
      // Re-enable body scroll when viewer closes and restore scroll position
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      window.scrollTo(0, scrollY);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  // ===== Single tap = show/hide controller (play + seeker); double tap =
  // sides = skip ±10s =====
  const lastTapRef = useRef<{ time: number; side: "left" | "right" } | null>(null);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showControls, setShowControls] = useState(true);

  const seekBy = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
  };

  const scheduleHideControls = () => {
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    scheduleHideControls();
  };

  const handleVideoTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const side: "left" | "right" = x < rect.width / 2 ? "left" : "right";
    const now = Date.now();

    const last = lastTapRef.current;
    if (last && now - last.time < 300 && last.side === side) {
      // Double tap: cancel the pending single-tap toggle and skip 10s
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapRef.current = null;
      seekBy(side === "right" ? 10 : -10);
      showControlsTemporarily();
    } else {
      lastTapRef.current = { time: now, side };
      // Delay the toggle so a second tap can cancel it
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = setTimeout(() => {
        singleTapTimerRef.current = null;
        setShowControls((c) => {
          const next = !c;
          if (next) scheduleHideControls();
          return next;
        });
      }, 300);
    }
  };

  // Cleanup pending timers
  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, []);

  // Side thirds navigate the carousel (image); center does nothing
  const handleImageTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (moment.images.length <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) {
      setCarouselIndex((i) => Math.max(0, i - 1));
    } else if (x > (rect.width * 2) / 3) {
      setCarouselIndex((i) => Math.min(moment.images.length - 1, i + 1));
    }
  };

  const downloadUrl = moment.video
    ? moment.video.originalUrl
    : moment.images[carouselIndex]?.originalUrl;

  return (
    <div className="vm-viewer">
      <button onClick={onClose} className="vm-viewer-close" aria-label="Đóng">
        <X className="vm-viewer-close-icon" />
      </button>
      {downloadUrl && <DownloadButton url={downloadUrl} className="vm-viewer-download" />}

      {moment.video ? (
        <div className="vm-viewer-player" onClick={handleVideoTap}>
          <video
            ref={videoRef}
            src={moment.video.originalUrl}
            poster={moment.video.thumbUrl || undefined}
            autoPlay
            loop
            playsInline
            muted={false}
            className="vm-viewer-media"
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />

          {/* Center play/pause — part of the controller (single tap toggles) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className={`vm-viewer-play${showControls ? "" : " hidden"}`}
            aria-label={playing ? "Dừng" : "Phát"}
          >
            {playing ? (
              <Pause className="vm-viewer-play-icon" />
            ) : (
              <Play className="vm-viewer-play-icon vm-viewer-play-play" />
            )}
          </button>

          {/* Bottom seeker + time — part of the controller (single tap toggles) */}
          <div
            className={`vm-viewer-seek${showControls ? "" : " hidden"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="vm-viewer-time">{formatTime(time)}</span>
            <div className="vm-viewer-seekbar">
              <div
                className="vm-viewer-seek-fill"
                style={{ width: duration ? `${(time / duration) * 100}%` : "0%" }}
              />
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={time}
                onChange={(e) => {
                  const t = Number(e.target.value);
                  const video = videoRef.current;
                  if (video) video.currentTime = t;
                  setTime(t);
                }}
                aria-label="Thanh tiến độ video"
                className="vm-viewer-seek-input"
              />
            </div>
            <span className="vm-viewer-time">{formatTime(duration)}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="vm-viewer-tap" onClick={handleImageTap}>
            <Image
              src={moment.images[carouselIndex].originalUrl}
              alt={moment.caption ?? ""}
              fill
              sizes="100vw"
              className="vm-viewer-media-img"
              priority
            />
          </div>
          {moment.images.length > 1 && (
            <div className="vm-viewer-dots">
              {moment.images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCarouselIndex(i)}
                  className={`vmv-dot ${i === carouselIndex ? "active" : ""}`}
                  aria-label={`Image ${i + 1}`}
                />
              ))}
            </div>
          )}
        </>
      )}

      <style jsx global>{`
        .vm-viewer {
          position: fixed;
          inset: 0;
          z-index: 9998;
          background: rgba(0, 0, 0, 0.97);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .vm-viewer-close {
          position: absolute;
          top: calc(env(safe-area-inset-top, 0px) + 10px);
          right: 12px;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 50%;
          color: white;
          cursor: pointer;
          padding: 0;
          z-index: 3;
        }

        .vm-viewer-close-icon {
          width: 18px;
          height: 18px;
        }

        .vm-viewer-download {
          position: absolute;
          top: calc(env(safe-area-inset-top, 0px) + 10px);
          right: 58px;
          z-index: 3;
        }

        .vm-viewer-player {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .vm-viewer-media {
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: 100%;
          object-fit: contain;
          pointer-events: none;
        }

        .vm-viewer-media-img {
          object-fit: contain;
        }

        .vm-viewer-play {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(6px);
          border: 2px solid rgba(255, 255, 255, 0.7);
          border-radius: 50%;
          color: white;
          cursor: pointer;
          padding: 0;
          z-index: 2;
          transition: transform 0.15s;
        }

        .vm-viewer-play:active {
          transform: translate(-50%, -50%) scale(0.92);
        }

        /* Controller shown/hidden (single tap toggles) */
        .vm-viewer-play.hidden,
        .vm-viewer-seek.hidden {
          opacity: 0;
          pointer-events: none;
        }

        .vm-viewer-play,
        .vm-viewer-seek {
          transition: opacity 0.2s ease;
        }

        .vm-viewer-play-icon {
          width: 26px;
          height: 26px;
          fill: currentColor;
        }

        .vm-viewer-play-play {
          margin-left: 3px;
        }

        .vm-viewer-seek {
          position: absolute;
          bottom: calc(24px + env(safe-area-inset-bottom, 0px));
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 20px;
          z-index: 2;
        }

        .vm-viewer-time {
          font-size: 12px;
          font-weight: 600;
          color: white;
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
          min-width: 34px;
        }

        .vm-viewer-seekbar {
          position: relative;
          flex: 1;
          height: 14px;
          display: flex;
          align-items: center;
        }

        .vm-viewer-seekbar::before {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          height: 4px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.3);
        }

        .vm-viewer-seek-fill {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          height: 4px;
          border-radius: 999px;
          background: white;
          pointer-events: none;
        }

        .vm-viewer-seek-input {
          position: absolute;
          inset: 0;
          width: 100%;
          opacity: 0;
          cursor: pointer;
          margin: 0;
          z-index: 3;
        }

        .vm-viewer-tap {
          position: absolute;
          inset: 0;
          cursor: pointer;
          z-index: 1;
        }

        .vm-viewer-dots {
          position: absolute;
          bottom: calc(24px + env(safe-area-inset-bottom, 0px));
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
          z-index: 2;
        }

        .vmv-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.45);
          border: none;
          padding: 0;
          cursor: pointer;
          transition: all 0.2s;
        }

        .vmv-dot.active {
          background: white;
          transform: scale(1.2);
        }
      `}</style>
    </div>
  );
}
