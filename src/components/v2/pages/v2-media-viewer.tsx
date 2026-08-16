"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { X, Play, Pause } from "lucide-react";
import { DownloadButton } from "@/components/common/download-button";

export interface V2MediaItem {
  type: "image" | "video";
  url: string;
  poster?: string;
}

interface V2MediaViewerProps {
  items: V2MediaItem[];
  initialIndex?: number;
  onClose: () => void;
}

const formatTime = (s: number): string => {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};

/**
 * Generic fullscreen media viewer — same look/feel/interactions as the
 * moment viewer (V2MomentViewer): contain-fit, custom video player
 * (single tap toggles controller, double tap sides skip ±10s), image
 * carousel via side-tap thirds + dots, X close, download.
 */
export function V2MediaViewer({ items, initialIndex = 0, onClose }: V2MediaViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const item = items[index];
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Custom player state
  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  // Pause the video when the viewer closes / item changes
  useEffect(() => {
    setTime(0);
    setPlaying(true);
    setShowControls(true);
    return () => {
      const v = videoRef.current;
      if (v) v.pause();
    };
  }, [index]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  // ===== Single tap = show/hide controller; double tap sides = ±10s =====
  const lastTapRef = useRef<{ time: number; side: "left" | "right" } | null>(null);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapRef.current = null;
      seekBy(side === "right" ? 10 : -10);
      showControlsTemporarily();
    } else {
      lastTapRef.current = { time: now, side };
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

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, []);

  // Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Side thirds navigate the carousel (image); center does nothing
  const handleImageTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (items.length <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) setIndex((i) => Math.max(0, i - 1));
    else if (x > (rect.width * 2) / 3) setIndex((i) => Math.min(items.length - 1, i + 1));
  };

  if (!item) return null;

  return (
    <div className="vm2-viewer">
      <button onClick={onClose} className="vm2-close" aria-label="Đóng">
        <X className="vm2-close-icon" />
      </button>
      <DownloadButton url={item.url} className="vm2-download" />

      {item.type === "video" ? (
        <div className="vm2-player" onClick={handleVideoTap}>
          <video
            ref={videoRef}
            src={item.url}
            poster={item.poster}
            autoPlay
            playsInline
            muted={false}
            className="vm2-media"
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className={`vm2-play${showControls ? "" : " hidden"}`}
            aria-label={playing ? "Dừng" : "Phát"}
          >
            {playing ? (
              <Pause className="vm2-play-icon" />
            ) : (
              <Play className="vm2-play-icon vm2-play-play" />
            )}
          </button>
          <div
            className={`vm2-seek${showControls ? "" : " hidden"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="vm2-time">{formatTime(time)}</span>
            <div className="vm2-seekbar">
              <div
                className="vm2-seek-fill"
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
                className="vm2-seek-input"
              />
            </div>
            <span className="vm2-time">{formatTime(duration)}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="vm2-tap" onClick={handleImageTap}>
            <Image src={item.url} alt="" fill sizes="100vw" className="vm2-media-img" priority />
          </div>
          {items.length > 1 && (
            <div className="vm2-dots">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className={`vm2-dot ${i === index ? "active" : ""}`}
                  aria-label={`Ảnh ${i + 1}`}
                />
              ))}
            </div>
          )}
        </>
      )}

      <style jsx global>{`
        .vm2-viewer {
          position: fixed;
          inset: 0;
          z-index: 9998;
          background: rgba(0, 0, 0, 0.97);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .vm2-close {
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

        .vm2-close-icon {
          width: 18px;
          height: 18px;
        }

        .vm2-download {
          position: absolute;
          top: calc(env(safe-area-inset-top, 0px) + 10px);
          right: 58px;
          z-index: 3;
        }

        .vm2-player {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .vm2-media {
          max-width: 100%;
          max-height: 100%;
          height: 100%;
          width: auto;
          object-fit: contain;
          pointer-events: none;
        }

        .vm2-media-img {
          object-fit: contain;
        }

        .vm2-play {
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
          transition: transform 0.15s, opacity 0.2s ease;
        }

        .vm2-play.hidden,
        .vm2-seek.hidden {
          opacity: 0;
          pointer-events: none;
        }

        .vm2-seek {
          transition: opacity 0.2s ease;
        }

        .vm2-play:active {
          transform: translate(-50%, -50%) scale(0.92);
        }

        .vm2-play-icon {
          width: 26px;
          height: 26px;
          fill: currentColor;
        }

        .vm2-play-play {
          margin-left: 3px;
        }

        .vm2-seek {
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

        .vm2-time {
          font-size: 12px;
          font-weight: 600;
          color: white;
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
          min-width: 34px;
        }

        .vm2-seekbar {
          position: relative;
          flex: 1;
          height: 14px;
          display: flex;
          align-items: center;
        }

        .vm2-seekbar::before {
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

        .vm2-seek-fill {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          height: 4px;
          border-radius: 999px;
          background: white;
          pointer-events: none;
        }

        .vm2-seek-input {
          position: absolute;
          inset: 0;
          width: 100%;
          opacity: 0;
          cursor: pointer;
          margin: 0;
          z-index: 3;
        }

        .vm2-tap {
          position: absolute;
          inset: 0;
          cursor: pointer;
          z-index: 1;
        }

        .vm2-dots {
          position: absolute;
          bottom: calc(24px + env(safe-area-inset-bottom, 0px));
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
          z-index: 2;
        }

        .vm2-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.45);
          border: none;
          padding: 0;
          cursor: pointer;
          transition: all 0.2s;
        }

        .vm2-dot.active {
          background: white;
          transform: scale(1.2);
        }
      `}</style>
    </div>
  );
}
