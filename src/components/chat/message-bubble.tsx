"use client";

import { toChatMessageRenderType } from "@/types/chat";
import type { MessageDto } from "@/types/chat";

interface MessageBubbleProps {
  msg: MessageDto;
  isMe: boolean;
  onViewMoment?: (momentId: number) => void;
}

export const MessageBubble = ({ msg, isMe, onViewMoment }: MessageBubbleProps) => {
  const renderType = toChatMessageRenderType(msg.type);

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
    return (
      <div
        className={`rounded-2xl px-4 py-2 ${isMe ? "bg-blue-600 text-white rounded-br-md" : "bg-muted rounded-bl-md"}`}
      >
        <p className="text-sm break-words whitespace-pre-wrap">📎 {msg.content}</p>
        <p className="mt-1 text-right text-[10px] opacity-70">
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
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
