"use client";

import { useEffect, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { X, Play, Check } from "lucide-react";
import { toChatMessageRenderType, isVideoUrl, MessageType } from "@/types/chat";
import type { MessageDto, RepliedMessageDto } from "@/types/chat";
import { ImageLightbox } from "@/components/common/image-lightbox";
import { DownloadButton } from "@/components/common/download-button";

interface MessageBubbleProps {
  msg: MessageDto;
  isMe: boolean;
  currentUserId?: number;
  onViewMoment?: (momentId: number) => void;
  isEdited?: boolean;
  onLongPress?: (msg: MessageDto, pos: { x: number; y: number }) => void;
  onOpenReactions?: (msg: MessageDto) => void;
  onReplyClick?: (messageId: number) => void;
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
      className={`select-none ${className}`}
      style={{ WebkitTouchCallout: "none" }}
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

const REPLIED_TYPE_LABEL: Record<number, string> = {
  [Number(MessageType.File)]: "[File]",
  [Number(MessageType.Emoji)]: "[Emoji]",
  [Number(MessageType.Sticker)]: "[Sticker]",
  [Number(MessageType.System)]: "[Hệ thống]",
  [Number(MessageType.Gif)]: "[GIF]",
};

const repliedLabel = (r: RepliedMessageDto): string => {
  const type = Number(r.type);
  if (type === Number(MessageType.Sticker) || type === Number(MessageType.Gif)) {
    return REPLIED_TYPE_LABEL[type] ?? "";
  }
  return r.content ? r.content : REPLIED_TYPE_LABEL[type] ?? "";
};

const ReplyQuote = ({
  msg,
  isMe,
  onReplyClick,
}: {
  msg: MessageDto;
  isMe: boolean;
  onReplyClick?: (messageId: number) => void;
}) => {
  const r = msg.repliedMessage;
  if (!r) return null;

  if (r.isDeleted) {
    return (
      <div
        className={`mb-1.5 rounded-lg px-2.5 py-1.5 text-xs opacity-80 ${isMe ? "bg-blue-500/30" : "bg-black/10"}`}
      >
        🚫 Tin nhắn đã bị xóa
      </div>
    );
  }

  const showThumb =
    (Number(r.type) === Number(MessageType.File) && !!r.attachments?.length) || !!r.momentThumbnail;
  const thumbUrl =
    (Number(r.type) === Number(MessageType.File) ? r.attachments?.[0]?.thumbUrl : null) ??
    r.momentThumbnail?.thumbUrl ??
    null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onReplyClick?.(r.messageId);
      }}
      className={`mb-1.5 flex min-w-0 cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs ${isMe ? "bg-blue-500/30" : "bg-black/10"}`}
    >
      <div className="min-w-0">
        <p className="truncate font-semibold">{r.senderName ?? "Người dùng"}</p>
        <p className="truncate opacity-80">{showThumb ? (Number(r.type) === Number(MessageType.File) ? "[File]" : "[Khoảnh khắc]") : repliedLabel(r)}</p>
      </div>
      {showThumb && thumbUrl && (
        <img src={thumbUrl} alt="" className="ml-auto h-9 w-9 shrink-0 rounded object-cover" />
      )}
    </button>
  );
};

const MessageTicks = ({ status, isMe }: { status?: number; isMe: boolean }) => {
  if (!isMe) return null;
  const read = status === 1;
  return (
    <span className="ml-1 inline-flex items-center align-middle">
      {read && <Check className="h-3 w-3 text-blue-300" strokeWidth={2.5} />}
      <Check
        className={`h-3 w-3 ${read ? "text-blue-300 -ml-1" : "text-white/70"}`}
        strokeWidth={2.5}
      />
    </span>
  );
};

export const MessageBubble = ({ msg, isMe, currentUserId, onViewMoment, isEdited, onLongPress, onOpenReactions, onReplyClick }: MessageBubbleProps) => {
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
          onClick={() => onOpenReactions?.(msg)}
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
        {msg.replyToId && <ReplyQuote msg={msg} isMe={isMe} onReplyClick={onReplyClick} />}
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
          <MessageTicks status={msg.status} isMe={isMe} />
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
            <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
              <DownloadButton url={videos[videoIndex].originalUrl} />
              <button
                onClick={handleVideoClose}
                className="rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                aria-label="Đóng video"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
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
      {msg.replyToId && <ReplyQuote msg={msg} isMe={isMe} onReplyClick={onReplyClick} />}
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
        <MessageTicks status={msg.status} isMe={isMe} />
      </p>
      {reactionRow}
    </BubbleWrapper>
  );
};
