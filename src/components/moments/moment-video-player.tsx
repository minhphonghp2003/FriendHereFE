"use client";

import { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";

interface MomentVideoPlayerProps {
  src: string;
}

export const MomentVideoPlayer = ({ src }: MomentVideoPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTapRef = useRef<{ time: number; side: "left" | "right" } | null>(null);
  const toggleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [seekIndicator, setSeekIndicator] = useState<"forward" | "backward" | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    const container = containerRef.current;
    if (!container) return;

    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === container);
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      setMuted(false);
      video.muted = false;
      video.play();
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    setMuted((prev) => {
      const next = !prev;
      video.muted = next;
      return next;
    });
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
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
        setShowControls((v) => !v);
        toggleTimeoutRef.current = null;
      }, 300);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-muted ${isFullscreen ? "h-full" : ""}`}
    >
      <div className="w-full" onClick={handleVideoClick}>
        <video
          ref={videoRef}
          src={src}
          autoPlay
          muted={muted}
          loop
          playsInline
          className={`pointer-events-none w-full ${isFullscreen ? "h-full object-contain" : ""}`}
        />
      </div>
      {seekIndicator && (
        <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2">
          <div className="rounded-lg bg-black/70 px-4 py-2 text-lg font-bold text-white">
            {seekIndicator === "backward" ? "-5s" : "+5s"}
          </div>
        </div>
      )}
      {showControls && (
        <>
          <button
            onClick={togglePlay}
            className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            {isPlaying ? <Pause className="h-6 w-6 fill-white" /> : <Play className="h-6 w-6 fill-white pl-0.5" />}
          </button>
          <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
            <button
              onClick={toggleMute}
              className="text-white hover:opacity-80"
              aria-label={muted ? "Bật tiếng" : "Tắt tiếng"}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <span className="text-xs text-white tabular-nums">{formatTime(currentTime)}</span>
          <div className="relative flex h-1 flex-1 items-center">
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
              className="absolute inset-0 z-20 w-full cursor-pointer opacity-0"
            />
          </div>
            <span className="text-xs text-white tabular-nums">{formatTime(duration)}</span>
            <button
              onClick={toggleFullscreen}
              className="text-white hover:opacity-80"
              aria-label={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
