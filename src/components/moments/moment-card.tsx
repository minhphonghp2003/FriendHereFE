"use client";

import Image from "next/image";
import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Trash2, EyeOff, Eye, Users, Heart, Star, Globe, MapPin, MoreHorizontal, MessageCircle, Loader2, Check, ChevronLeft } from "lucide-react";
import { MomentImageCarousel } from "./moment-image-carousel";
import { ReactionBottomSheet } from "./reaction-bottom-sheet";
import { MomentVideoPlayer } from "./moment-video-player";
import { TimelineChip } from "@/components/timelines/timeline-chip";
import { Button } from "@/components/ui/button";
import { DownloadButton } from "@/components/common/download-button";
import { useDeleteMoment, useHideMoment, useChangeMomentVisibility } from "@/hooks/moments";
import { addMomentReaction } from "@/services/moment";
import { getOpponentConversation } from "@/services/chat";
import { appHub } from "@/lib/signalr/app-hub";
import type { MomentDto, MomentReactionDto, MomentVisibility } from "@/types/moment";
import { MOMENT_VISIBILITY_VALUES } from "@/types/moment";

const COMMON_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

const BURST_TTL_MS = 800;

interface ReactionBurst {
  id: number;
  emoji: string;
  x: number;
  y: number;
}

interface MomentCardProps {
  moment: MomentDto;
  currentUserId?: number;
  onDelete?: (id: number) => void;
  onHide?: (id: number) => void;
  fullscreen?: boolean;
  active?: boolean;
  showInfo?: boolean;
  onToggleInfo?: () => void;
  hideTimelineChip?: boolean;
}

const visibilityConfig: Record<MomentVisibility, { icon: typeof EyeOff; label: string }> = {
  OnlyMe: { icon: EyeOff, label: "Chỉ tôi" },
  Friends: { icon: Users, label: "Bạn bè" },
  BestFriend: { icon: Star, label: "Bạn thân" },
  Lover: { icon: Heart, label: "Người yêu" },
  Public: { icon: Globe, label: "Công khai" },
};

const VISIBILITY_OPTIONS = Object.keys(MOMENT_VISIBILITY_VALUES) as MomentVisibility[];

const VisibilityOption = ({
  value,
  active,
  disabled,
  onClick,
}: {
  value: MomentVisibility;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) => {
  const cfg = visibilityConfig[value];
  const Icon = cfg.icon;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 text-left">{cfg.label}</span>
      {active && <Check className="h-4 w-4 text-emerald-500" />}
    </button>
  );
};

export const MomentCard = ({ moment, currentUserId, onDelete, onHide, fullscreen = false, active = true, showInfo = true, onToggleInfo, hideTimelineChip = false }: MomentCardProps) => {
  const router = useRouter();
  const { mutate: deleteMoment, isLoading: deleting } = useDeleteMoment();
  const { mutate: hideMoment, isLoading: hiding } = useHideMoment();
  const { mutate: changeVisibility, isLoading: changingVisibility } = useChangeMomentVisibility();
  const [showMenu, setShowMenu] = useState(false);
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
  const [reactingEmoji, setReactingEmoji] = useState<string | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [localReactions, setLocalReactions] = useState<MomentReactionDto[]>(moment.reactions);
  const [localVisibility, setLocalVisibility] = useState<MomentVisibility>(moment.visibility);
  const reactTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstIdRef = useRef(0);
  const [bursts, setBursts] = useState<ReactionBurst[]>([]);
  const fullscreenVideoRef = useRef<HTMLVideoElement | null>(null);
  const isOwner = currentUserId === moment.userId;

  useEffect(() => {
    const video = fullscreenVideoRef.current;
    if (!video) return;
    if (active) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [active]);

  useEffect(() => {
    return () => {
      if (reactTimeoutRef.current) clearTimeout(reactTimeoutRef.current);
    };
  }, []);

  const spawnBurst = (emoji: string, x: number, y: number) => {
    const id = ++burstIdRef.current;
    setBursts((prev) => [...prev.slice(-5), { id, emoji, x, y }]);
    setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== id));
    }, BURST_TTL_MS);
  };

  useEffect(() => {
    setLocalReactions(moment.reactions);
  }, [moment.reactions]);

  useEffect(() => {
    setLocalVisibility(moment.visibility);
  }, [moment.visibility]);

  useEffect(() => {
    if (!isOwner) return;
    const unsub = appHub.onReceiveMomentReacted((data) => {
      if (data.momentId !== moment.id) return;
      setLocalReactions((prev) => {
        const exists = prev.some((r) => r.userId === data.userId && r.emoji === data.emoji);
        if (exists) return prev;
        return [...prev, { userId: data.userId, emoji: data.emoji }];
      });
    });
    return unsub;
  }, [isOwner, moment.id]);

  const groupedReactions = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const r of localReactions) {
      const list = map.get(r.emoji) ?? [];
      list.push(r.userId);
      map.set(r.emoji, list);
    }
    return Array.from(map.entries()).map(([emoji, userIds]) => ({ emoji, userIds, count: userIds.length }));
  }, [localReactions]);

  const handleReact = (emoji: string, x?: number, y?: number) => {
    if (typeof x === "number" && typeof y === "number") spawnBurst(emoji, x, y);
    setReactingEmoji(emoji);
    if (reactTimeoutRef.current) clearTimeout(reactTimeoutRef.current);
    reactTimeoutRef.current = setTimeout(() => {
      addMomentReaction(moment.id, emoji).finally(() => {
        setReactingEmoji((current) => (current === emoji ? null : current));
      });
    }, 500);
  };

  const handleViewProfile = () => {
    router.push(`/user/${moment.userId}`);
  };

  const handleSendMessage = async () => {
    if (sendingMessage) return;
    setSendingMessage(true);
    try {
      const res = await getOpponentConversation(moment.userId);
      if (res.data) {
        router.push(`/chat/${res.data}?momentId=${moment.id}`);
      } else {
        router.push(`/chat/new?receiverId=${moment.userId}&name=${encodeURIComponent(moment.userName)}&momentId=${moment.id}`);
      }
    } catch {
      router.push(`/chat/new?receiverId=${moment.userId}&name=${encodeURIComponent(moment.userName)}&momentId=${moment.id}`);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMoment(moment.id);
      onDelete?.(moment.id);
    } catch {}
    setShowMenu(false);
  };

  const handleHide = async () => {
    try {
      await hideMoment(moment.id);
      onHide?.(moment.id);
    } catch {}
    setShowMenu(false);
  };

  const handleChangeVisibility = async (vis: MomentVisibility) => {
    try {
      const updated = await changeVisibility(moment.id, vis);
      if (updated) setLocalVisibility(updated.visibility);
    } catch {}
    setShowVisibilityMenu(false);
    setShowMenu(false);
  };

  const toggleMenu = () => {
    setShowMenu((v) => !v);
    setShowVisibilityMenu(false);
  };

  const visConfig = visibilityConfig[localVisibility] || visibilityConfig.Friends;
  const VisIcon = visConfig.icon;
  const displayName = isOwner ? "Bạn" : moment.userName;
  const infoVisible = showInfo || !!moment.video;
  const downloadUrl = moment.video
    ? moment.video.originalUrl
    : moment.images.length > 1
      ? moment.images[carouselIndex]?.originalUrl
      : moment.images[0]?.originalUrl;

  if (fullscreen) {
    return (
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-black">
        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-0 flex items-center justify-center">
            {moment.status === "Processing" ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-white" />
                <span className="text-sm font-medium text-white">Đang xử lý...</span>
              </div>
            ) : moment.video ? (
              <video
                ref={fullscreenVideoRef}
                src={moment.video.originalUrl}
                poster={moment.video.thumbUrl || undefined}
                controls
                autoPlay
                playsInline
                className="h-full w-full object-cover"
              />
            ) : moment.images.length === 1 ? (
              <Image
                src={moment.images[0].originalUrl}
                alt=""
                fill
                sizes="(max-width: 640px) 412px, 625px"
                onClick={onToggleInfo}
                className="h-full w-full object-contain select-none"
                draggable={false}
                fetchPriority="high"
              />
            ) : (
              <MomentImageCarousel
                fullscreen
                images={moment.images}
                showInfo={showInfo}
                onToggleInfo={onToggleInfo}
                onIndexChange={setCarouselIndex}
              />
            )}
          </div>

          {infoVisible && (
            <div className="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-5">
              {!isOwner &&
                COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={(e) => handleReact(emoji, e.clientX, e.clientY)}
                    className="text-3xl text-white/90 drop-shadow-lg transition-transform hover:scale-110"
                  >
                    {emoji}
                  </button>
                ))}
              {!isOwner && moment.allowComment && (
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage}
                  className="flex flex-col items-center gap-0.5 text-white/90 hover:text-white disabled:opacity-50"
                >
                  <MessageCircle className="h-8 w-8 drop-shadow-lg" />
                  <span className="text-[11px] font-medium">{sendingMessage ? "..." : "Nhắn tin"}</span>
                </button>
              )}
              {isOwner && groupedReactions.length > 0 && (
                <button
                  onClick={() => setShowReactions(true)}
                  className="flex flex-col-reverse items-center text-white/90 hover:text-white"
                >
                  {groupedReactions.slice(0, 3).map((g) => (
                    <span key={g.emoji} className="text-3xl drop-shadow-lg">{g.emoji}</span>
                  ))}
                </button>
              )}
            </div>
          )}
        </div>

        {infoVisible && (
          <div className="animate-in fade-in-0 slide-in-from-top-2 duration-200 absolute inset-x-0 top-0 z-20 flex items-start justify-between bg-gradient-to-b from-black/70 via-black/20 to-transparent px-4 pb-16 pt-4">
          <div className="flex min-w-0 cursor-pointer items-center gap-3" onClick={handleViewProfile}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 text-sm font-bold text-white ring-2 ring-white/70">
              {moment.userImage ? (
                <img
                  src={moment.userImage.thumbUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                displayName.charAt(0)
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{displayName}</p>
              <div className="flex items-center gap-1.5 text-xs text-white/80">
                <VisIcon className="h-3 w-3" />
                <span>{visConfig.label}</span>
                <span>·</span>
                <span>{new Date(moment.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="relative flex shrink-0 items-center gap-1">
            {downloadUrl && <DownloadButton url={downloadUrl} />}
            <button
              onClick={toggleMenu}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10"
              aria-label="Tùy chọn"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {showMenu && (
              <div className="animate-in fade-in-0 zoom-in-95 duration-100 absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-border bg-background shadow-md">
                {showVisibilityMenu ? (
                  <>
                    <button
                      onClick={() => setShowVisibilityMenu(false)}
                      className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Quyền riêng tư
                    </button>
                    {VISIBILITY_OPTIONS.map((vis) => (
                      <VisibilityOption
                        key={vis}
                        value={vis}
                        active={vis === localVisibility}
                        disabled={changingVisibility}
                        onClick={() => handleChangeVisibility(vis)}
                      />
                    ))}
                  </>
                ) : isOwner ? (
                  <>
                    <button
                      onClick={() => setShowVisibilityMenu(true)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                    >
                      <Eye className="h-4 w-4" />
                      Đổi quyền riêng tư
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deleting ? "Đang xóa..." : "Xóa"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleHide}
                    disabled={hiding}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                  >
                    <EyeOff className="h-4 w-4" />
                    {hiding ? "Đang ẩn..." : "Ẩn"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        )}

        {infoVisible && (
          <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200 z-10 border-t border-white/10 bg-black px-4 pb-4 pt-3">
            {moment.timeline && !hideTimelineChip && (
              <div className="mb-2 flex justify-start">
                <TimelineChip timeline={moment.timeline} variant="dark" />
              </div>
            )}
            {moment.caption && (
              <p className="mb-2 text-sm font-medium text-white drop-shadow">{moment.caption}</p>
            )}
            {moment.location?.isShowed && (
              <div className="mb-2 flex items-center gap-1.5 text-xs text-white/80">
                <MapPin className="h-3 w-3" />
                <span>{moment.location.placeName || `${moment.location.latitude.toFixed(4)}, ${moment.location.longitude.toFixed(4)}`}</span>
              </div>
            )}
          </div>
        )}

        <ReactionBottomSheet
          momentId={moment.id}
          open={showReactions}
          onClose={() => setShowReactions(false)}
        />

        {bursts.map((b) => (
          <span
            key={b.id}
            className="pointer-events-none fixed z-[70] text-4xl"
            style={{ left: b.x, top: b.y, animation: "reaction-burst 0.8s ease-out forwards" }}
          >
            {b.emoji}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex cursor-pointer items-center gap-3 p-3" onClick={handleViewProfile}>
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-bold text-muted-foreground">
          {moment.userImage ? (
            <img
              src={moment.userImage.thumbUrl}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            displayName.charAt(0)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{displayName}</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <VisIcon className="h-3 w-3" />
            <span>{visConfig.label}</span>
            <span>·</span>
            <span>{new Date(moment.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleMenu}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          {showMenu && (
            <div className="animate-in fade-in-0 zoom-in-95 duration-100 absolute right-0 top-full z-10 mt-1 w-44 rounded-md border border-border bg-background shadow-md">
              {showVisibilityMenu ? (
                <>
                  <button
                    onClick={() => setShowVisibilityMenu(false)}
                    className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Quyền riêng tư
                  </button>
                  {VISIBILITY_OPTIONS.map((vis) => (
                    <VisibilityOption
                      key={vis}
                      value={vis}
                      active={vis === localVisibility}
                      disabled={changingVisibility}
                      onClick={() => handleChangeVisibility(vis)}
                    />
                  ))}
                </>
              ) : isOwner ? (
                <>
                  <button
                    onClick={() => setShowVisibilityMenu(true)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                  >
                    <Eye className="h-4 w-4" />
                    Đổi quyền riêng tư
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deleting ? "Đang xóa..." : "Xóa"}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleHide}
                  disabled={hiding}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                >
                  <EyeOff className="h-4 w-4" />
                  {hiding ? "Đang ẩn..." : "Ẩn"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {moment.caption && (
        <p className="px-3 pb-2 text-sm">{moment.caption}</p>
      )}

      {moment.timeline && !hideTimelineChip && (
        <div className="flex justify-start px-3 pb-2">
          <TimelineChip timeline={moment.timeline} variant="light" />
        </div>
      )}

      <div className="relative">
        {moment.video && (
          <MomentVideoPlayer src={moment.video.originalUrl} />
        )}
        {!moment.video && moment.images.length === 1 && (
          <div className="relative aspect-square w-full overflow-hidden bg-muted">
            <Image
              src={moment.images[0].originalUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 412px, 745px"
              className="h-full w-full object-cover select-none"
              draggable={false}
            />
          </div>
        )}
        {!moment.video && moment.images.length > 1 && (
          <MomentImageCarousel images={moment.images} />
        )}
        {moment.status === "Processing" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/40">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
            <span className="text-sm font-medium text-white">Đang xử lý...</span>
          </div>
        )}
      </div>

      {moment.location?.isShowed && (
        <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{moment.location.placeName || `${moment.location.latitude.toFixed(4)}, ${moment.location.longitude.toFixed(4)}`}</span>
        </div>
      )}

      {!isOwner && (
        <div className="flex items-center border-t border-border px-3 py-2">
          <div className="flex flex-1 items-center gap-1">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={(e) => handleReact(emoji, e.clientX, e.clientY)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-base hover:bg-muted"
              >
                {emoji}
              </button>
            ))}
          </div>
          {moment.allowComment && (
            <button
              onClick={handleSendMessage}
              disabled={sendingMessage}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{sendingMessage ? "Đang gửi..." : "Nhắn tin"}</span>
            </button>
          )}
        </div>
      )}

      {isOwner && (
        <button
          onClick={() => setShowReactions(true)}
          className="flex w-full flex-wrap items-center gap-2 border-t border-border px-3 py-2 text-left hover:bg-muted/50"
        >
          {groupedReactions.length > 0 ? (
            groupedReactions.map((g) => (
              <span
                key={g.emoji}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
              >
                <span>{g.emoji}</span>
                <span className="font-medium tabular-nums text-muted-foreground">{g.count}</span>
              </span>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">Chưa có cảm xúc</span>
          )}
        </button>
      )}

      <ReactionBottomSheet
        momentId={moment.id}
        open={showReactions}
        onClose={() => setShowReactions(false)}
      />

      {bursts.map((b) => (
        <span
          key={b.id}
          className="pointer-events-none fixed z-[70] text-4xl"
          style={{ left: b.x, top: b.y, animation: "reaction-burst 0.8s ease-out forwards" }}
        >
          {b.emoji}
        </span>
      ))}
    </div>
  );
};
