"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { appHub } from "@/lib/signalr/app-hub";
import { createConversation } from "@/services/chat";
import { getMomentById, getMomentThumbnail } from "@/services/moment";
import { ArrowLeft, X } from "lucide-react";
import type { ImageDto } from "@/types/chat";

export default function NewChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const receiverId = Number(searchParams.get("receiverId"));
  const name = searchParams.get("name") ?? "";
  const momentId = searchParams.get("momentId") ? Number(searchParams.get("momentId")) : null;
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [pendingMoment, setPendingMoment] = useState<ImageDto | null>(null);
  const [pendingMomentLoading, setPendingMomentLoading] = useState(!!momentId);

  useEffect(() => {
    if (!momentId) return;
    getMomentById(momentId)
      .then((res) => {
        if (res.success && res.data) {
          setPendingMoment(getMomentThumbnail(res.data));
        }
      })
      .catch(() => {})
      .finally(() => setPendingMomentLoading(false));
  }, [momentId]);

  useEffect(() => {
    if (!receiverId) router.replace("/chat");
  }, [receiverId, router]);

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && !pendingMoment) || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await createConversation(receiverId, text, 0, momentId);
      if (!res.success || !res.data) {
        setError("Không thể tạo cuộc trò chuyện");
        return;
      }
      const conversationId = res.data;
      await appHub.sendMessage({
        conversationId,
        content: text,
        messageType: 0,
        replyToId: null,
        idempotencyKey: crypto.randomUUID(),
        momentId,
      });
      router.replace(`/chat/${conversationId}`);
    } catch (err) {
      setError("Không thể gửi tin nhắn");
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (!receiverId) return null;

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col">
      <div className="border-border flex items-center gap-3 border-b p-3">
        <button onClick={() => router.back()} className="hover:bg-muted rounded p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="font-semibold">{name}</p>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4 text-sm">Bắt đầu cuộc trò chuyện với {name}</p>
        {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
      </div>
      <div className="border-border border-t">
        {pendingMomentLoading ? (
          <div className="bg-muted mx-3 mt-3 h-20 w-20 animate-pulse rounded-lg" />
        ) : pendingMoment ? (
          <div className="relative mx-3 mt-3 inline-block">
            <img
              src={pendingMoment.thumbUrl}
              alt=""
              className="h-20 w-20 rounded-lg object-cover"
            />
            <button
              onClick={() => setPendingMoment(null)}
              className="bg-background absolute -top-2 -right-2 rounded-full p-0.5 shadow"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <div className="flex items-center gap-2 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Nhập tin nhắn..."
            className="bg-muted flex-1 rounded-full px-4 py-2 text-sm outline-none"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !pendingMoment) || sending}
            className="bg-primary hover:bg-primary/90 rounded-full p-2 text-white disabled:opacity-50"
          >
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}
