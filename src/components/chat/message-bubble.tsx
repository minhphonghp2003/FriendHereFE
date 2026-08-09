"use client";

import { useEffect, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { X, Play } from "lucide-react";
import { toChatMessageRenderType, isVideoUrl, getMessagePreview } from "@/types/chat";
import type { MessageDto } from "@/types/chat";
import { ImageLightbox } from "@/components/common/image-lightbox";

interface MessageBubbleProps {
  msg: MessageDto;
  isMe: boolean;
  currentUserId?: number;
  onViewMoment?: (momentId: number) => void;
  replyMessage?: MessageDto | null;
  isEdited?: boolean;
  onLongPress?: (msg: MessageDto, pos: { x: number; y: number }) => void;
  onReact?: (msg: MessageDto, emoji: string) => void;
  onOpenReactions?: (msg: MessageDto) => void;
}

interface BubbleWrapperProps {
  msg: MessageDto;
  onLongPress?: (msg: MessageDto, pos: { x: number; y: number }) => void;
  className?: string;
  children: ReactNode;
}

const BubbleWrapper = ({ msg, onLongPress, className, children }: BubbleWrapperProps) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);
  const posRef = useRef({ x: 0, y: 0 });

  const start = useCallback(
    (e: React.SyntheticEvent) => {
      const native = e.nativeEvent as MouseEvent | TouchEvent;
      if ("clientX" in native) {
        posRef.current = { x: native.clientX, y: native.clientY };
      } else if (native.touches && native.touches.length > 0) {
        posRef.current = { x: native.touches[0].clientX, y: native.touches[0].clientY };
      }
      if (timerRef.current) return;
      timerRef.current = setTimeout(() => {
        suppressClickRef.current = true;
        onLongPress?.(msg, posRef.current);
      }, 500);
    },
    [msg, onLongPress],
  );

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (suppressClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClickRef.current = false;
    }
  }, []);

  return (
    <div
      className={className}
      onTouchStart={start}
      onTouchEnd={cancel}
      onTouchMove={cancel}
      onMouseDown={start}
      onMouseUp={cancel}
      onMouseLeave={cancel}
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress?.(msg, { x: e.clientX, y: e.clientY });
      }}
    >
      {children}
    </div>
  );
};

export const MessageBubble = ({ msg, isMe, currentUserId, onViewMoment, replyMessage, isEdited, onLongPress, onReact, onOpenReactions }: MessageBubbleProps) => {
  const renderType = toChatMessageRenderType(msg.type);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [videoIndex, setVideoIndex] = useState<number | null>(null);

  const handleVideoClose = useCallback(() => setVideoIndex(null), []);

  const groupedReactions = useMemo(() => {
    const map = new Map<string, { count: number; mine: boolean }>();
    for (const r of msg.reactions ?? []) {
      const cur = map.get(r.emoji) ?? { count: 0, mine: false };
      cur.count += 1;
      if (r.userId === currentUserId) cur.mine = true;
      map.set(r.emoji, cur);
    }
    return [...map.entries()].map(([emoji, { count, mine }]) => ({ emoji, count, mine }));
  }, [msg.reactions, currentUserId]);

  const reactionRow = groupedReactions.length > 0 ? (
    <div className={`relative z-10 mt-1 flex flex-wrap gap-1 ${isMe ? "justify-end" : "justify-start"}`}>
      {groupedReactions.map((g) => (
        <button
          key={g.emoji}
          onClick={() => onReact?.(msg, g.emoji)}
          onContextMenu={(e) => {
            e.preventDefault();
            onOpenReactions?.(msg);
          }}
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs shadow-sm ${g.mine ? "border-blue-400 bg-blue-100/70" : "border-border bg-background/90"}`}
        >
          <span>{g.emoji}</span>
          <span className={g.mine ? "font-semibold text-blue-600" : "text-muted-foreground"}>{g.count}</span>
        </button>
      ))}
    </div>
  ) : null;

  useEffect(() => {
    if (videoIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVideoIndex(null);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [videoIndex]);

  if (renderType === "System") {
    return <p className="text-center text-xs text-muted-foreground">{msg.content}</p>;
  }

  if (msg.isDeleted) {
    return (
      <div
        className={`rounded-2xl px-4 py-2 italic text-xs text-muted-foreground ${isMe ? "bg-muted/60 rounded-br-md" : "bg-muted rounded-bl-md"}`}
      >
        Message has been deleted
      </div>
    );
  }

  const replyQuote =
    msg.replyToId && replyMessage ? (
      <div className={`mb-1.5 rounded-lg px-2.5 py-1.5 text-xs ${isMe ? "bg-blue-500/30" : "bg-black/10"}`}>
        <p className="truncate font-semibold">{replyMessage.senderName}</p>
        <p className="truncate opacity-80">
          {replyMessage.isDeleted ? "Message has been deleted" : (replyMessage.content ?? getMessagePreview(replyMessage))}
        </p>
      </div>
    ) : null;

  const editedLabel = isEdited ? " · đã chỉnh sửa" : "";

  if (renderType === "Emoji") {
    return (
      <div className="inline-block max-w-full">
        <BubbleWrapper msg={msg} onLongPress={onLongPress} className="text-4xl leading-none">
          {msg.content}
        </BubbleWrapper>
        {reactionRow}
      </div>
    );
  }

  if (renderType === "Sticker") {
    return (
      <div className="inline-block max-w-full">
        <BubbleWrapper msg={msg} onLongPress={onLongPress} className="h-28 w-28 rounded-xl object-contain">
          <img src={msg.content ?? ""} alt="" className="h-28 w-28 rounded-xl object-contain" />
        </BubbleWrapper>
        {reactionRow}
      </div>
    );
  }

  if (renderType === "Gif") {
    return (
      <div className="inline-block max-w-full">
        <BubbleWrapper msg={msg} onLongPress={onLongPress} className="max-h-[220px] max-w-[220px] rounded-xl object-contain">
          <img
            src={msg.content ?? ""}
            alt=""
            className="max-h-[220px] max-w-[220px] rounded-xl object-contain"
          />
        </BubbleWrapper>
        {reactionRow}
      </div>
    );
  }

  if (renderType === "File") {
    const images = msg.attachments.filter((a) => !isVideoUrl(a.originalUrl));
    const videos = msg.attachments.filter((a) => isVideoUrl(a.originalUrl));
    return (
      <BubbleWrapper
        msg={msg}
        onLongPress={onLongPress}
        className={`rounded-2xl px-2 py-2 ${isMe ? "bg-blue-600 text-white rounded-br-md" : "bg-muted rounded-bl-md"}`}
      >
        {replyQuote}
        <div className="space-y-1.5">
          {videos.map((v, i) => (
            <button
              key={`v-${i}`}
              onClick={() => setVideoIndex(i)}
              className="group relative block overflow-hidden rounded-lg"
            >
              <img
                src={v.thumbUrl || v.originalUrl}
                alt=""
                className="max-h-[260px] max-w-[260px] object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white transition-transform group-hover:scale-110">
                  <Play className="h-6 w-6 fill-white pl-0.5" />
                </span>
              </div>
            </button>
          ))}
          {images.length > 0 && (
            <div
              className={`grid gap-1 ${
                images.length === 1
                  ? "grid-cols-1"
                  : images.length === 2
                    ? "grid-cols-2"
                    : "grid-cols-3"
              }`}
            >
              {images.map((img, i) => (
                <button
                  key={`i-${i}`}
                  onClick={() => setLightboxIndex(i)}
                  className="overflow-hidden rounded-lg"
                >
                  <img
                    src={img.thumbUrl || img.originalUrl}
                    alt=""
                    className={`object-cover ${images.length === 1 ? "h-full max-h-[260px] w-full" : "aspect-square w-full"}`}
                  />
                </button>
              ))}
            </div>
          )}
          {msg.content ? (
            <p className="px-1 text-sm break-words whitespace-pre-wrap">{msg.content}</p>
          ) : null}
        </div>
        <p className="mt-1 text-right text-[10px] opacity-70">
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {editedLabel}
        </p>
        {reactionRow}
        {images.length > 0 && lightboxIndex !== null && (
          <ImageLightbox
            images={images}
            initialIndex={lightboxIndex}
            open
            onClose={() => setLightboxIndex(null)}
          />
        )}
        {videoIndex !== null && videos[videoIndex] && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
            onClick={handleVideoClose}
          >
            <button
              onClick={handleVideoClose}
              className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
              aria-label="Đóng video"
            >
              <X className="h-6 w-6" />
            </button>
            <video
              src={videos[videoIndex].originalUrl}
              poster={videos[videoIndex].thumbUrl || undefined}
              controls
              autoPlay
              playsInline
              className="max-h-[90vh] max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </BubbleWrapper>
    );
  }

  return (
    <BubbleWrapper
      msg={msg}
      onLongPress={onLongPress}
      className={`rounded-2xl px-4 py-2 ${isMe ? "bg-blue-600 text-white rounded-br-md" : "bg-muted rounded-bl-md"}`}
    >
      {replyQuote}
      {msg.momentThumbnail ? (
        <div className="mb-1.5">
          <img
            src={msg.momentThumbnail.thumbUrl}
            alt=""
            onClick={() => msg.momentId && onViewMoment?.(msg.momentId)}
            className="h-20 w-20 cursor-pointer rounded-lg object-cover"
          />
        </div>
      ) : null}
      {msg.content ? (
        <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>
      ) : null}
      <p className="mt-1 text-right text-[10px] opacity-70">
        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        {editedLabel}
      </p>
      {reactionRow}
    </BubbleWrapper>
  );
};
