"use client";

import { useEffect, useCallback, useState } from "react";
import { X, Play } from "lucide-react";
import { toChatMessageRenderType, isVideoUrl } from "@/types/chat";
import type { MessageDto } from "@/types/chat";
import { ImageLightbox } from "@/components/common/image-lightbox";

interface MessageBubbleProps {
  msg: MessageDto;
  isMe: boolean;
  onViewMoment?: (momentId: number) => void;
}

export const MessageBubble = ({ msg, isMe, onViewMoment }: MessageBubbleProps) => {
  const renderType = toChatMessageRenderType(msg.type);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [videoIndex, setVideoIndex] = useState<number | null>(null);

  const handleVideoClose = useCallback(() => setVideoIndex(null), []);

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

  if (renderType === "Emoji") {
    return <div className="text-4xl leading-none">{msg.content}</div>;
  }

  if (renderType === "Sticker") {
    return <img src={msg.content ?? ""} alt="" className="h-28 w-28 rounded-xl object-contain" />;
  }

  if (renderType === "Gif") {
    return (
      <img
        src={msg.content ?? ""}
        alt=""
        className="max-h-[220px] max-w-[220px] rounded-xl object-contain"
      />
    );
  }

  if (renderType === "File") {
    const images = msg.attachments.filter((a) => !isVideoUrl(a.originalUrl));
    const videos = msg.attachments.filter((a) => isVideoUrl(a.originalUrl));
    return (
      <div
        className={`rounded-2xl px-2 py-2 ${isMe ? "bg-blue-600 text-white rounded-br-md" : "bg-muted rounded-bl-md"}`}
      >
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
        </p>
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
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl px-4 py-2 ${isMe ? "bg-blue-600 text-white rounded-br-md" : "bg-muted rounded-bl-md"}`}
    >
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
      </p>
    </div>
  );
};
