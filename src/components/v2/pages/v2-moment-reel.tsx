"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  MessageCircle,
  EyeOff,
  Eye,
  Users,
  Heart,
  Star,
  Globe,
  Trash2,
  Loader2,
  Check,
  ChevronDown,
  Maximize2,
  X,
  Play,
  Pause,
} from "lucide-react";
import { TimelineChip } from "@/components/timelines/timeline-chip";
import { ReactionBottomSheet } from "@/components/moments/reaction-bottom-sheet";
import { DownloadButton } from "@/components/common/download-button";
import { useDeleteMoment, useHideMoment, useChangeMomentVisibility } from "@/hooks/moments";
import { addMomentReaction } from "@/services/moment";
import { getOpponentConversation } from "@/services/chat";
import { appHub } from "@/lib/signalr/app-hub";
import type { MomentDto, MomentVisibility } from "@/types/moment";
import { MOMENT_VISIBILITY_VALUES } from "@/types/moment";
import { toast } from "sonner";

const COMMON_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

const visibilityConfig: Record<MomentVisibility, { icon: typeof EyeOff; label: string }> = {
  OnlyMe: { icon: EyeOff, label: "Chỉ tôi" },
  Friends: { icon: Users, label: "Bạn bè" },
  BestFriend: { icon: Star, label: "Bạn thân" },
  Lover: { icon: Heart, label: "Người yêu" },
  Public: { icon: Globe, label: "Công khai" },
};

const VISIBILITY_OPTIONS = Object.keys(MOMENT_VISIBILITY_VALUES) as MomentVisibility[];

interface V2MomentReelProps {
  moment: MomentDto;
  currentUserId?: number;
  active?: boolean;
  onDelete?: (id: number) => void;
  onHide?: (id: number) => void;
  /** Open a user's detail (same modal as map marker tap) */
  onUserTap?: (userId: number) => void;
}

const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  const date = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${time} ${date}`;
};

/**
 * v2 reel item: media sits in the upper ~55% (object-cover, cropped so nothing
 * overlaps it), a large white rounded bottom sheet carries the author info,
 * date pill, engagement row and reaction avatars. Tap the media to open a
 * fullscreen contain-fit viewer with the video player.
 */
export function V2MomentReel({
  moment,
  currentUserId,
  active = true,
  onDelete,
  onHide,
  onUserTap,
}: V2MomentReelProps) {
  const router = useRouter();
  const { mutate: deleteMoment, isLoading: deleting } = useDeleteMoment();
  const { mutate: hideMoment, isLoading: hiding } = useHideMoment();
  const { mutate: changeVisibility, isLoading: changingVisibility } = useChangeMomentVisibility();

  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [localReactions, setLocalReactions] = useState(moment.reactions);
  const [localVisibility, setLocalVisibility] = useState<MomentVisibility>(moment.visibility);
  const reactTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const viewerVideoRef = useRef<HTMLVideoElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  // Publish the ACTUAL sheet height so the scroll-to-top button can anchor
  // right above it (no pixel guessing) — only the ACTIVE reel reports it
  useEffect(() => {
    if (!active) return;
    const el = sheetRef.current;
    if (!el) return;
    const publish = () => {
      document.documentElement.style.setProperty(
        "--vm-sheet-h",
        `${Math.round(el.getBoundingClientRect().height)}px`,
      );
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, [active]);
  const isOwner = currentUserId === moment.userId;

  // ===== Audio: NO toggle — always try to play with sound. If the browser
  // blocks unmuted autoplay (before first interaction), start muted and a
  // one-time global gesture listener un-mutes automatically. =====
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const unlock = () => {
      const video = videoRef.current;
      setMuted(false);
      if (video) video.muted = false;
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
    document.addEventListener("pointerdown", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  // Play/pause the cropped video with feed visibility
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active && !showViewer) {
      video.muted = muted;
      video.play().catch(() => {
        // Unmuted autoplay blocked → retry muted, the unlock listener will
        // unmute after the first user gesture
        video.muted = true;
        setMuted(true);
        video.play().catch(() => {});
      });
      setFeedPaused(false);
    } else {
      video.pause();
      setFeedPaused(true);
    }
  }, [active, showViewer, muted]);

  // Keep the tap-layer icon in sync with external pauses
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setFeedPaused(false);
    const onPause = () => setFeedPaused(true);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  // Viewer video: play on open, pause on close
  useEffect(() => {
    const video = viewerVideoRef.current;
    if (!video) return;
    if (showViewer) {
      video.play().catch(() => {});
    }
  }, [showViewer]);

  useEffect(() => {
    setLocalReactions(moment.reactions);
  }, [moment.reactions]);

  useEffect(() => {
    setLocalVisibility(moment.visibility);
  }, [moment.visibility]);

  // Clear the pending debounced reaction on unmount (v1)
  useEffect(() => {
    return () => {
      if (reactTimeoutRef.current) clearTimeout(reactTimeoutRef.current);
    };
  }, []);

  // Live reaction updates for my own moments (v1)
  useEffect(() => {
    if (!isOwner) return;
    const unsub = appHub.onReceiveMomentReacted((data) => {
      if (data.momentId !== moment.id) return;
      setLocalReactions((prev) => {
        if (prev.some((r) => r.userId === data.userId && r.emoji === data.emoji)) return prev;
        return [...prev, { userId: data.userId, emoji: data.emoji }];
      });
    });
    return unsub;
  }, [isOwner, moment.id]);

  const totalReactions = localReactions.length;

  // v1: reactions grouped by emoji (owner stack)
  const groupedReactions = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const r of localReactions) {
      const list = map.get(r.emoji) ?? [];
      list.push(r.userId);
      map.set(r.emoji, list);
    }
    return Array.from(map.entries()).map(([emoji, userIds]) => ({
      emoji,
      userIds,
      count: userIds.length,
    }));
  }, [localReactions]);

  const handleReact = (emoji: string, x?: number, y?: number) => {
    if (typeof x === "number" && typeof y === "number") spawnBurst(emoji, x, y);
    setLocalReactions((prev) => {
      if (prev.some((r) => r.userId === currentUserId && r.emoji === emoji)) return prev;
      return [...prev, { userId: currentUserId ?? -1, emoji }];
    });
    // v1: debounce the API call 500ms so rapid taps don't spam
    if (reactTimeoutRef.current) clearTimeout(reactTimeoutRef.current);
    reactTimeoutRef.current = setTimeout(() => {
      addMomentReaction(moment.id, emoji).catch(() => {
        toast.error("Không thể thả cảm xúc");
      });
    }, 500);
  };

  const handleSendMessage = async () => {
    if (sendingMessage) return;
    setSendingMessage(true);
    try {
      const res = await getOpponentConversation(moment.userId);
      if (res.data) {
        router.push(`/chat/${res.data}?momentId=${moment.id}`);
      } else {
        router.push(
          `/chat/new?receiverId=${moment.userId}&name=${encodeURIComponent(moment.userName)}&momentId=${moment.id}`,
        );
      }
    } catch {
      router.push(
        `/chat/new?receiverId=${moment.userId}&name=${encodeURIComponent(moment.userName)}&momentId=${moment.id}`,
      );
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Xóa khoảnh khắc này? Hành động không thể hoàn tác.")) return;
    try {
      await deleteMoment(moment.id);
      toast.success("Đã xóa khoảnh khắc");
      onDelete?.(moment.id);
    } catch {
      toast.error("Không thể xóa");
    }
  };

  const handleHideMoment = async () => {
    if (!window.confirm("Ẩn khoảnh khắc này khỏi feed của bạn?")) return;
    try {
      await hideMoment(moment.id);
      toast.success("Đã ẩn khoảnh khắc");
      onHide?.(moment.id);
    } catch {
      toast.error("Không thể ẩn");
    }
  };

  const handleChangeVisibility = async (vis: MomentVisibility) => {
    try {
      const updated = await changeVisibility(moment.id, vis);
      setLocalVisibility(updated.visibility);
      setShowVisibilityMenu(false);
      toast.success("Đã đổi quyền riêng tư");
    } catch {
      toast.error("Không thể đổi quyền riêng tư");
    }
  };

  const visConfig = visibilityConfig[localVisibility] || visibilityConfig.Friends;
  const VisIcon = visConfig.icon;
  const displayName = isOwner ? "Bạn" : moment.userName;
  const downloadUrl = moment.video
    ? moment.video.originalUrl
    : moment.images[carouselIndex]?.originalUrl;
  const heroImage = moment.video?.thumbUrl || moment.images[carouselIndex]?.originalUrl || null;

  const openViewer = useCallback(() => setShowViewer(true), []);

  // ===== Viewer video custom controls =====
  const [viewerPlaying, setViewerPlaying] = useState(true);
  const [viewerTime, setViewerTime] = useState(0);
  const [viewerDuration, setViewerDuration] = useState(0);

  const formatTime = (s: number): string => {
    if (!Number.isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const toggleViewerPlay = () => {
    const video = viewerVideoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const handleViewerTap = (e: React.MouseEvent<HTMLDivElement>) => {
    // Tap sides = seek ±5s (v1 double-tap behavior simplified to single tap);
    // center handled by the play button itself
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const video = viewerVideoRef.current;
    if (!video) return;
    if (x < rect.width / 3) {
      video.currentTime = Math.max(0, video.currentTime - 5);
    } else if (x > (rect.width * 2) / 3) {
      video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
    }
  };

  // ===== Media tap zones (image): left/right = carousel, center = viewer =====
  const handleMediaTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (moment.images.length <= 1) {
      openViewer();
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) {
      setCarouselIndex((i) => Math.max(0, i - 1));
    } else if (x > (rect.width * 2) / 3) {
      setCarouselIndex((i) => Math.min(moment.images.length - 1, i + 1));
    } else {
      openViewer();
    }
  };

  // ===== Viewer image tap zones: left/right = carousel; center does nothing
  // (close via the X button) =====
  const handleViewerImageTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (moment.images.length <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) {
      setCarouselIndex((i) => Math.max(0, i - 1));
    } else if (x > (rect.width * 2) / 3) {
      setCarouselIndex((i) => Math.min(moment.images.length - 1, i + 1));
    }
  };

  // ===== Feed video tap-to-toggle =====
  const [feedPaused, setFeedPaused] = useState(false);

  const toggleFeedVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };
  const [bursts, setBursts] = useState<{ id: number; emoji: string; x: number; y: number }[]>([]);
  const burstIdRef = useRef(0);

  const spawnBurst = (emoji: string, x: number, y: number) => {
    const id = ++burstIdRef.current;
    setBursts((prev) => [...prev.slice(-5), { id, emoji, x, y }]);
    setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== id));
    }, 800);
  };

  return (
    <div className="vm-reel">
      {/* ===== Media zone (upper part, cropped cover) ===== */}
      <div className="vm-media-zone">
        {moment.status === "Processing" ? (
          <div className="vm-processing">
            <Loader2 className="vm-processing-icon" />
            <span>Đang xử lý...</span>
          </div>
        ) : moment.video ? (
          <>
            <div className="vm-media-wrap">
              <video
                ref={videoRef}
                src={moment.video.originalUrl}
                poster={moment.video.thumbUrl || undefined}
                playsInline
                loop
                className="vm-media"
              />
              {/* Tap video = play/pause (no fullscreen on tap) */}
              <button onClick={toggleFeedVideo} className="vm-video-tap" aria-label="Play/Pause">
                {feedPaused && <Play className="vm-video-tap-icon" />}
              </button>
              {/* Fullscreen at the VIDEO's top-right */}
              <button
                onClick={openViewer}
                className="vm-expand-btn vm-expand-on-media"
                aria-label="Fullscreen"
              >
                <Maximize2 className="vm-expand-icon" />
              </button>
            </div>
          </>
        ) : moment.images.length > 0 ? (
          <>
            <div className="vm-media-wrap">
              <div className="vm-media" onClick={handleMediaTap}>
                <Image
                  src={moment.images[carouselIndex].originalUrl}
                  alt={moment.caption ?? ""}
                  fill
                  sizes="100vw"
                  className="vm-media-img"
                  priority={active}
                />
                {/* Carousel dots */}
                {moment.images.length > 1 && (
                  <div className="vm-dots">
                    {moment.images.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCarouselIndex(i);
                        }}
                        className={`vm-dot ${i === carouselIndex ? "active" : ""}`}
                        aria-label={`Image ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
              {/* No expand button for images — center tap opens the viewer */}
            </div>
          </>
        ) : null}
      </div>

      {/* ===== Bottom sheet card ===== */}
      <div className="vm-sheet" ref={sheetRef}>
        {/* Row 1: avatar + name/visibility | date pill + more menu */}
        <div className="vm-sheet-row-1">
          <button
            className="vm-author"
            onClick={() => onUserTap?.(moment.userId)}
            aria-label={`View ${moment.userName}`}
          >
            <div className="vm-avatar">
              {moment.userImage?.thumbUrl ? (
                <img
                  src={moment.userImage.thumbUrl}
                  alt={displayName}
                  className="vm-avatar-img"
                />
              ) : (
                <span className="vm-avatar-initial">{displayName.charAt(0)}</span>
              )}
            </div>
            <div className="vm-author-text">
              <span className="vm-author-name">{displayName}</span>
              {isOwner ? (
                <button
                  className="vm-author-sub vm-vis-toggle"
                  onClick={() => setShowVisibilityMenu((v) => !v)}
                  aria-label="Đổi quyền riêng tư"
                >
                  <VisIcon className="vm-author-sub-icon" />
                  {visConfig.label}
                  <ChevronDown className="vm-vis-chevron" />
                </button>
              ) : (
                <span className="vm-author-sub">
                  <VisIcon className="vm-author-sub-icon" />
                  {visConfig.label}
                </span>
              )}
            </div>
          </button>

          <div className="vm-row-1-right">
            <span className="vm-date-pill">{formatDateTime(moment.createdAt)}</span>

            {/* Direct delete (owner) / hide (others) — replaces the ⋯ menu */}
            {isOwner ? (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="vm-action-btn"
                aria-label="Xóa"
                title="Xóa"
              >
                {deleting ? (
                  <Loader2 className="vm-action-icon spinning" />
                ) : (
                  <Trash2 className="vm-action-icon" />
                )}
              </button>
            ) : (
              <button
                onClick={handleHideMoment}
                disabled={hiding}
                className="vm-action-btn"
                aria-label="Ẩn"
                title="Ẩn"
              >
                {hiding ? (
                  <Loader2 className="vm-action-icon spinning" />
                ) : (
                  <EyeOff className="vm-action-icon" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Owner: horizontal visibility selector (replaces the label row) */}
        {isOwner && showVisibilityMenu ? (
          <div className="vm-vis-row">
            <div className="vm-vis-options">
              {VISIBILITY_OPTIONS.map((vis) => {
                const Ico = visibilityConfig[vis].icon;
                return (
                  <button
                    key={vis}
                    onClick={() => handleChangeVisibility(vis)}
                    disabled={changingVisibility}
                    className={`vm-vis-chip ${vis === localVisibility ? "active" : ""}`}
                  >
                    <Ico className="vm-vis-chip-icon" />
                    {visibilityConfig[vis].label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowVisibilityMenu(false)}
              className="vm-vis-close"
              aria-label="Đóng"
            >
              <X className="vm-vis-close-icon" />
            </button>
          </div>
        ) : null}

        {/* Timeline + location (one compact line, ellipsized) + caption */}
        {(moment.timeline || moment.location?.isShowed || moment.caption) && (
          <div className="vm-sheet-details">
            {(moment.timeline || moment.location?.isShowed) && (
              <div className="vm-badges-row">
                {moment.timeline && (
                  <span className="vm-badge vm-badge-timeline">
                    <TimelineChip timeline={moment.timeline} variant="light" />
                  </span>
                )}
                {moment.location?.isShowed && (
                  <span className="vm-badge vm-location">
                    <MapPin className="vm-location-icon" />
                    <span className="vm-badge-text">
                      {moment.location.placeName ||
                        `${moment.location.latitude.toFixed(4)}, ${moment.location.longitude.toFixed(4)}`}
                    </span>
                  </span>
                )}
              </div>
            )}
            {moment.caption && <p className="vm-caption">{moment.caption}</p>}
          </div>
        )}

        {/* Row 2: engagement — role-split like v1.
            Owner: reaction stack only (tap → detail sheet); ROW HIDDEN when
            there are no reactions at all (no empty placeholder).
            Others: horizontal quick emojis + send-message (chat with moment). */}
        {(!isOwner || groupedReactions.length > 0) && (
          <div className="vm-sheet-row-2">
            {isOwner ? (
              /* Owner: overlapping reactor stack → tap to see detail (v1) */
              <button
                className="vm-owner-stack"
                onClick={() => setShowReactions(true)}
                aria-label="Xem cảm xúc"
              >
                <span className="vm-stack-avatars">
                  {groupedReactions.slice(0, 3).map((g) => (
                    <span key={g.emoji} className="vm-stack-emoji">
                      {g.emoji}
                    </span>
                  ))}
                </span>
              </button>
            ) : (
            /* Others: horizontal quick react icons (v1 COMMON_EMOJIS) */
            <div className="vm-quick-reacts">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={(e) => handleReact(emoji, e.clientX, e.clientY)}
                  className="vm-quick-react"
                  aria-label={`Thả ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

            {/* Others: send message (chat box with the moment attached) */}
            {!isOwner && (
              <button
                className="vm-engagement vm-send-btn"
                onClick={handleSendMessage}
                disabled={sendingMessage || !moment.allowComment}
                aria-label="Nhắn tin"
                title={!moment.allowComment ? "Đã tắt bình luận" : "Nhắn tin"}
              >
                <MessageCircle className="vm-engagement-icon" />
                {sendingMessage ? "..." : "Nhắn tin"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ===== Fullscreen viewer (contain fit) ===== */}
      {showViewer && (
        <div className="vm-viewer">
          <button onClick={() => setShowViewer(false)} className="vm-viewer-close" aria-label="Close">
            <X className="vm-viewer-close-icon" />
          </button>
          {/* Download (fullscreen only) — v1 DownloadButton */}
          {downloadUrl && (
            <DownloadButton url={downloadUrl} className="vm-viewer-download" />
          )}
          {moment.video ? (
            /* Custom player: center play/pause + bottom seeker/time (no native controls) */
            <div className="vm-viewer-player" onClick={handleViewerTap}>
              <video
                ref={viewerVideoRef}
                src={moment.video.originalUrl}
                poster={moment.video.thumbUrl || undefined}
                autoPlay
                loop
                playsInline
                /* Opened from a user gesture → sound is allowed */
                muted={false}
                className="vm-viewer-media"
                onTimeUpdate={(e) => setViewerTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setViewerDuration(e.currentTarget.duration || 0)}
                onPlay={() => setViewerPlaying(true)}
                onPause={() => setViewerPlaying(false)}
              />

              {/* Center play/pause */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleViewerPlay();
                }}
                className="vm-viewer-play"
                aria-label={viewerPlaying ? "Dừng" : "Phát"}
              >
                {viewerPlaying ? (
                  <Pause className="vm-viewer-play-icon" />
                ) : (
                  <Play className="vm-viewer-play-icon vm-viewer-play-play" />
                )}
              </button>

              {/* Bottom seeker + time */}
              <div className="vm-viewer-seek" onClick={(e) => e.stopPropagation()}>
                <span className="vm-viewer-time">{formatTime(viewerTime)}</span>
                <div className="vm-viewer-seekbar">
                  <div
                    className="vm-viewer-seek-fill"
                    style={{ width: viewerDuration ? `${(viewerTime / viewerDuration) * 100}%` : "0%" }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={viewerDuration || 0}
                    step={0.1}
                    value={viewerTime}
                    onChange={(e) => {
                      const t = Number(e.target.value);
                      const video = viewerVideoRef.current;
                      if (video) video.currentTime = t;
                      setViewerTime(t);
                    }}
                    aria-label="Thanh tiến độ video"
                    className="vm-viewer-seek-input"
                  />
                </div>
                <span className="vm-viewer-time">{formatTime(viewerDuration)}</span>
              </div>
            </div>
          ) : (
            <>
              {/* Tap zones: left/right thirds = prev/next image, center = close */}
              <div className="vm-viewer-tap" onClick={handleViewerImageTap}>
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
                      className={`vm-dot ${i === carouselIndex ? "active" : ""}`}
                      aria-label={`Image ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <ReactionBottomSheet
        momentId={moment.id}
        open={showReactions}
        onClose={() => setShowReactions(false)}
      />

      {/* Reaction bursts (v1 animation) */}
      {bursts.map((b) => (
        <span
          key={b.id}
          className="vm-burst"
          style={{ left: b.x, top: b.y, animation: "reaction-burst 0.8s ease-out forwards" }}
        >
          {b.emoji}
        </span>
      ))}

      <style jsx global>{`
        .vm-reel {
          position: relative;
          height: 100%;
          width: 100%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          /* Neon-primary backdrop spans the WHOLE reel (media + info sheet) */
          background:
            radial-gradient(circle at 15% 20%, rgba(43, 176, 175, 0.35), transparent 50%),
            radial-gradient(circle at 85% 85%, rgba(43, 176, 175, 0.28), transparent 50%),
            var(--vm-bg, #f4f4f5);
        }

        /* ===== Media zone: fills all space above the sheet; media is a 9:16
           rounded card with margins, nearly touching the sheet ===== */
        .vm-media-zone {
          position: relative;
          flex: 1 1 auto;
          min-height: 0;
          overflow: hidden;
          display: flex;
          align-items: stretch;
          justify-content: center;
          padding: 10px 12px 0;
          box-sizing: border-box;
        }

        .vm-media-wrap {
          position: relative;
          width: 100%;
          max-height: 100%;
          aspect-ratio: 9 / 14;
          margin: 0 auto;
          align-self: center;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.28);
          background: var(--vm-surface-2, #27272a);
        }

        .vm-media {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          cursor: pointer;
        }

        .vm-media-img {
          object-fit: cover;
        }

        .vm-media-img {
          object-fit: cover;
        }

        .vm-processing {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: white;
          font-size: 14px;
        }

        .vm-processing-icon {
          width: 32px;
          height: 32px;
          animation: vm-spin 1s linear infinite;
        }

        @keyframes vm-spin {
          to { transform: rotate(360deg); }
        }

        /* Tap layer over the feed video: toggles play/pause; shows a center
           play glyph only while paused */
        .vm-video-tap {
          position: absolute;
          inset: 0;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          z-index: 4;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .vm-video-tap-icon {
          width: 56px;
          height: 56px;
          padding: 0 0 0 6px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(6px);
          border: 2px solid rgba(255, 255, 255, 0.7);
          color: white;
          fill: currentColor;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Fullscreen button — pinned to the VIDEO's top-right (inside the
           rounded media card) */
        .vm-expand-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 9px;
          color: white;
          cursor: pointer;
          padding: 0;
          z-index: 6;
        }

        .vm-expand-icon {
          width: 16px;
          height: 16px;
        }

        .vm-dots {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
          z-index: 5;
        }

        .vm-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.45);
          border: none;
          padding: 0;
          cursor: pointer;
          transition: all 0.2s;
        }

        .vm-dot.active {
          background: white;
          transform: scale(1.2);
        }

        /* ===== Bottom sheet (translucent — neon backdrop shows through) ===== */
        .vm-sheet {
          position: relative;
          flex: 0 0 auto;
          background: color-mix(in srgb, var(--vm-surface, white) 86%, transparent);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-radius: 24px 24px 0 0;
          padding: 10px 14px calc(8px + env(safe-area-inset-bottom, 0px));
          box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.15);
          z-index: 4;
          color: var(--vm-text, #18181b);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .vm-sheet-row-1 {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .vm-row-1-right {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .vm-author {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          min-width: 0;
          text-align: left;
        }

        .vm-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          background: linear-gradient(135deg, #e4e4e7, #d4d4d8);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .vm-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .vm-avatar-initial {
          font-size: 14px;
          font-weight: 700;
          color: var(--vm-text-3, #71717a);
        }

        .vm-author-text {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }

        .vm-author-name {
          font-size: 15px;
          font-weight: 800;
          color: var(--vm-text, #18181b);
          line-height: 1.15;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .vm-author-sub {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 500;
          color: var(--vm-text-3, #a1a1aa);
          line-height: 1.1;
        }

        .vm-author-sub-icon {
          width: 12px;
          height: 12px;
        }

        .vm-date-pill {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 999px;
          background: #16a34a;
          color: white;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }

        /* One compact badges line: timeline + location, each ellipsized */
        .vm-badges-row {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          min-width: 0;
        }

        .vm-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          min-width: 0;
          max-width: 50%;
          background: var(--vm-surface-2, #f4f4f5);
          border-radius: 999px;
          padding: 3px 10px;
          font-size: 11px;
          font-weight: 500;
          color: var(--vm-text-2, #52525b);
          white-space: nowrap;
        }

        .vm-badge-timeline {
          /* TimelineChip renders its own styles; clamp inside our pill */
          display: inline-flex;
          align-items: center;
          overflow: hidden;
          padding: 0;
        }

        .vm-badge-timeline > :global(*) {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .vm-location {
          overflow: hidden;
        }

        .vm-badge-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
        }

        .vm-location-icon {
          width: 11px;
          height: 11px;
          color: #16a34a;
          flex-shrink: 0;
        }

        .vm-sheet-details {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .vm-caption {
          margin: 0;
          font-size: 13px;
          font-weight: 500;
          color: var(--vm-text-2, #3f3f46);
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
          width: 100%;
        }

        /* ===== Engagement row ===== */
        .vm-sheet-row-2 {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          min-height: 34px;
        }

        /* Owner: overlapping emoji stack → detail sheet */
        .vm-owner-stack {
          display: flex;
          align-items: center;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
        }

        .vm-stack-avatars {
          display: flex;
        }

        .vm-stack-emoji {
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          background: var(--vm-surface-2, #f4f4f5);
          border: 2px solid var(--vm-surface, white);
          border-radius: 50%;
          margin-left: -7px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .vm-stack-emoji:first-child {
          margin-left: 0;
        }

        /* Others: horizontal quick reacts */
        .vm-quick-reacts {
          display: flex;
          align-items: center;
          gap: 0;
        }

        .vm-quick-react {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
          background: none;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          padding: 0;
          transition: transform 0.15s, background 0.2s;
        }

        .vm-quick-react:hover {
          transform: scale(1.2);
        }

        .vm-quick-react:active {
          transform: scale(0.9);
        }

        /* Reaction burst (v1 keyframes from globals.css) */
        .vm-burst {
          position: fixed;
          z-index: 9999;
          pointer-events: none;
          font-size: 40px;
          transform: translate(-50%, 0);
        }

        .vm-send-btn {
          color: #2BB0AF;
        }

        .vm-engagement {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          padding: 0;
          color: var(--vm-text-3, #71717a);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .vm-engagement:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .vm-engagement-icon {
          width: 20px;
          height: 20px;
        }

        /* Direct delete/hide action button (replaces the ⋯ menu) */
        .vm-action-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          border-radius: 50%;
          color: var(--vm-text-3, #71717a);
          cursor: pointer;
          padding: 0;
          transition: all 0.2s;
        }

        .vm-action-btn:hover:not(:disabled) {
          background: var(--vm-surface-2, #f4f4f5);
          color: #ef4444;
        }

        .vm-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .vm-action-icon {
          width: 17px;
          height: 17px;
        }

        .vm-action-icon.spinning {
          animation: vm-spin 1s linear infinite;
        }

        /* Owner visibility toggle (below the author name) */
        .vm-vis-toggle {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 500;
          color: var(--vm-text-3, #a1a1aa);
          line-height: 1.1;
        }

        .vm-vis-toggle:hover {
          color: var(--vm-text-2, #52525b);
        }

        .vm-vis-chevron {
          width: 11px;
          height: 11px;
        }

        /* Owner: horizontal visibility selector row */
        .vm-vis-row {
          display: flex;
          align-items: center;
          gap: 6px;
          animation: vm-vis-in 0.2s ease-out;
        }

        @keyframes vm-vis-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .vm-vis-options {
          display: flex;
          gap: 4px;
          flex: 1;
          min-width: 0;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .vm-vis-options::-webkit-scrollbar {
          display: none;
        }

        .vm-vis-chip {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          border-radius: 999px;
          background: var(--vm-surface-2, #f4f4f5);
          border: 1px solid var(--vm-border, #e4e4e7);
          color: var(--vm-text-2, #52525b);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .vm-vis-chip:hover:not(:disabled) {
          border-color: rgba(43, 176, 175, 0.5);
        }

        .vm-vis-chip.active {
          background: #2BB0AF;
          border-color: #2BB0AF;
          color: white;
        }

        .vm-vis-chip:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .vm-vis-chip-icon {
          width: 12px;
          height: 12px;
        }

        .vm-vis-close {
          width: 26px;
          height: 26px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--vm-surface-2, #f4f4f5);
          border: 1px solid var(--vm-border, #e4e4e7);
          border-radius: 50%;
          color: var(--vm-text-2, #52525b);
          cursor: pointer;
          padding: 0;
        }

        .vm-vis-close-icon {
          width: 13px;
          height: 13px;
        }

        /* ===== Fullscreen viewer ===== */
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

        /* Download button — left of the close button in the viewer */
        .vm-viewer-download {
          position: absolute;
          top: calc(env(safe-area-inset-top, 0px) + 10px);
          right: 58px;
          z-index: 3;
        }

        /* Custom video player wrapper */
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

        /* Tap layer for viewer images: left/right thirds navigate the carousel */
        .vm-viewer-tap {
          position: absolute;
          inset: 0;
          cursor: pointer;
          z-index: 1;
        }

        /* Center play/pause */
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

        .vm-viewer-play-icon {
          width: 26px;
          height: 26px;
          fill: currentColor;
        }

        .vm-viewer-play-play {
          margin-left: 3px;
        }

        /* Bottom seeker + time */
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

        .vm-viewer-seek-input {
          position: absolute;
          inset: 0;
          width: 100%;
          opacity: 0;
          cursor: pointer;
          margin: 0;
          z-index: 3;
        }

        .vm-viewer-dots {
          position: absolute;
          bottom: calc(24px + env(safe-area-inset-bottom, 0px));
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
        }
      `}</style>
    </div>
  );
}
