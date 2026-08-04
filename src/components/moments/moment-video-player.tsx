"use client";

import { useRef, useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface MomentVideoPlayerProps {
  src: string;
  active?: boolean;
  fullscreen?: boolean;
  onToggleInfo?: () => void;
  showInfo?: boolean;
}

export const MomentVideoPlayer = ({
  src,
  active = true,
  fullscreen = false,
  onToggleInfo,
  showInfo = true,
}: MomentVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTapRef = useRef<{ time: number; side: "left" | "right" } | null>(null);
  const toggleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [seekIndicator, setSeekIndicator] = useState<"forward" | "backward" | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onLoadedMetadata = () => setDuration(video.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      video.play().catch(() => {});
    } else {
      video.pause();
      setShowControls(false);
    }
  }, [active]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  };

  const handleVideoClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const side = x < rect.width / 2 ? "left" : "right";
    const now = Date.now();

    if (lastTapRef.current && now - lastTapRef.current.time < 300 && lastTapRef.current.side === side) {
      if (toggleTimeoutRef.current) clearTimeout(toggleTimeoutRef.current);
      toggleTimeoutRef.current = null;
      const video = videoRef.current;
      if (!video) return;
      const seek = side === "right" ? 5 : -5;
      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seek));
      setShowControls(true);
      setSeekIndicator(side === "right" ? "forward" : "backward");
      setTimeout(() => setSeekIndicator(null), 600);
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { time: now, side };
      toggleTimeoutRef.current = setTimeout(() => {
        if (onToggleInfo) {
          onToggleInfo();
        } else {
          setShowControls((v) => !v);
        }
        toggleTimeoutRef.current = null;
      }, 300);
    }
  };

  const controlsVisible = onToggleInfo ? showInfo : showControls;

  return (
    <div className="relative w-full bg-muted">
      <div className="w-full" onClick={handleVideoClick}>
        <video
          ref={videoRef}
          src={src}
          autoPlay
          loop
          playsInline
          className="pointer-events-none w-full"
        />
      </div>
      {seekIndicator && (
        <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2">
          <div className="rounded-lg bg-black/70 px-4 py-2 text-lg font-bold text-white">
            {seekIndicator === "backward" ? "-5s" : "+5s"}
          </div>
        </div>
      )}
      {controlsVisible && (
        <>
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <button
              onClick={togglePlay}
              className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              aria-label={isPlaying ? "Dừng" : "Phát"}
            >
              {isPlaying ? <Pause className="h-6 w-6 fill-white" /> : <Play className="h-6 w-6 fill-white pl-0.5" />}
            </button>
          </div>
          <div
            className={`absolute inset-x-0 px-4 ${fullscreen ? "bottom-12" : "bottom-4"}`}
          >
            <div className="relative flex h-1 w-full items-center">
              <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-white/30" />
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white"
                style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
              />
              <div
                className="absolute z-10 h-3 w-3 rounded-full bg-white"
                style={{
                  left: duration ? `${(currentTime / duration) * 100}%` : "0%",
                  transform: "translate(-50%, 0)",
                }}
              />
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                aria-label="Thanh tiến độ video"
                className="absolute inset-0 z-20 w-full cursor-pointer opacity-0"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
