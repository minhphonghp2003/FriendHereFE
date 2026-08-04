"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SmilePlus, Trash2, EyeOff, Users, Heart, Star, Globe, MapPin, MoreHorizontal, MessageCircle, Loader2 } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { MomentImageCarousel } from "./moment-image-carousel";
import { ReactionBottomSheet } from "./reaction-bottom-sheet";
import { MomentVideoPlayer } from "./moment-video-player";
import { Button } from "@/components/ui/button";
import { useDeleteMoment, useHideMoment } from "@/hooks/moments";
import { addMomentReaction } from "@/services/moment";
import { getOpponentConversation } from "@/services/chat";
import { appHub } from "@/lib/signalr/app-hub";
import type { MomentDto, MomentReactionDto, MomentVisibility } from "@/types/moment";

const COMMON_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

interface MomentCardProps {
  moment: MomentDto;
  currentUserId?: number;
  onDelete?: (id: number) => void;
  onHide?: (id: number) => void;
  fullscreen?: boolean;
  active?: boolean;
  showInfo?: boolean;
  onToggleInfo?: () => void;
}

const visibilityConfig: Record<MomentVisibility, { icon: typeof EyeOff; label: string }> = {
  OnlyMe: { icon: EyeOff, label: "Chỉ tôi" },
  Friends: { icon: Users, label: "Bạn bè" },
  BestFriend: { icon: Star, label: "Bạn thân" },
  Lover: { icon: Heart, label: "Người yêu" },
  Public: { icon: Globe, label: "Công khai" },
};

export const MomentCard = ({ moment, currentUserId, onDelete, onHide, fullscreen = false, active = true, showInfo = true, onToggleInfo }: MomentCardProps) => {
  const router = useRouter();
  const { mutate: deleteMoment, isLoading: deleting } = useDeleteMoment();
  const { mutate: hideMoment, isLoading: hiding } = useHideMoment();
  const [showMenu, setShowMenu] = useState(false);
  const [reactingEmoji, setReactingEmoji] = useState<string | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [localReactions, setLocalReactions] = useState<MomentReactionDto[]>(moment.reactions);
  const isOwner = currentUserId === moment.userId;

  useEffect(() => {
    setLocalReactions(moment.reactions);
  }, [moment.reactions]);

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

  const handleReact = (emoji: string) => {
    setReactingEmoji(emoji);
    addMomentReaction(moment.id, emoji).finally(() => setReactingEmoji(null));
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

  const visConfig = visibilityConfig[moment.visibility] || visibilityConfig.Friends;
  const VisIcon = visConfig.icon;
  const displayName = isOwner ? "Bạn" : moment.userName;

  if (fullscreen) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-black">
        <div className="absolute inset-0 flex items-center justify-center">
          {moment.status === "Processing" ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-white" />
              <span className="text-sm font-medium text-white">Đang xử lý...</span>
            </div>
          ) : moment.video ? (
            <MomentVideoPlayer
              src={moment.video.originalUrl}
              active={active}
              fullscreen
              showInfo={showInfo}
              onToggleInfo={onToggleInfo}
            />
          ) : moment.images.length === 1 ? (
            <img
              src={moment.images[0].originalUrl}
              alt=""
              onClick={onToggleInfo}
              className="h-full w-full object-contain select-none"
              draggable={false}
            />
          ) : (
            <MomentImageCarousel
              fullscreen
              images={moment.images}
              showInfo={showInfo}
              onToggleInfo={onToggleInfo}
            />
          )}
        </div>

        {showInfo && (
          <div className="absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/70 via-black/20 to-transparent px-4 pb-16 pt-4">
          <div className="flex min-w-0 items-center gap-3">
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
          <div className="relative shrink-0">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10"
              aria-label="Tùy chọn"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-border bg-background shadow-md">
                {isOwner ? (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deleting ? "Đang xóa..." : "Xóa"}
                  </button>
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

        {showInfo && (
          <div className="absolute bottom-24 right-2 z-10 flex flex-col items-center gap-5">
            {!isOwner &&
              COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  disabled={reactingEmoji === emoji}
                  className="text-3xl text-white/90 drop-shadow-lg transition-transform hover:scale-110 disabled:opacity-50"
                >
                  {emoji}
                </button>
              ))}
            {!isOwner && (
              <button
                onClick={() => setShowEmojiPicker(true)}
                disabled={reactingEmoji !== null}
                className="text-white/90 hover:text-white disabled:opacity-50"
              >
                <SmilePlus className="h-8 w-8 drop-shadow-lg" />
              </button>
            )}
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

        {showInfo && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-4 pb-24 pt-16 pr-20">
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

        {showEmojiPicker && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setShowEmojiPicker(false)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <EmojiPicker
                onEmojiClick={(emojiData) => {
                  handleReact(emojiData.emoji);
                  setShowEmojiPicker(false);
                }}
                width={300}
                height={380}
              />
            </div>
          </div>
        )}

        <ReactionBottomSheet
          momentId={moment.id}
          open={showReactions}
          onClose={() => setShowReactions(false)}
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-3 p-3">
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
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          {showMenu && (
            <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded-md border border-border bg-background shadow-md">
              {isOwner ? (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? "Đang xóa..." : "Xóa"}
                </button>
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

      <div className="relative">
        {moment.video && (
          <MomentVideoPlayer src={moment.video.originalUrl} />
        )}
        {!moment.video && moment.images.length === 1 && (
          <div className="relative aspect-square w-full overflow-hidden bg-muted">
            <img
              src={moment.images[0].originalUrl}
              alt=""
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
                onClick={() => handleReact(emoji)}
                disabled={reactingEmoji === emoji}
                className="flex h-7 w-7 items-center justify-center rounded-md text-base hover:bg-muted disabled:opacity-50"
              >
                {emoji}
              </button>
            ))}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={reactingEmoji !== null}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                <SmilePlus className="h-4 w-4" />
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 z-50 mb-2">
                  <div className="rounded-lg border border-border bg-background shadow-lg">
                    <EmojiPicker
                      onEmojiClick={(emojiData) => {
                        handleReact(emojiData.emoji);
                        setShowEmojiPicker(false);
                      }}
                      width={280}
                      height={320}
                    />
                  </div>
                </div>
              )}
            </div>
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
    </div>
  );
};
