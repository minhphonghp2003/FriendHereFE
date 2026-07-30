"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { appHub } from "@/lib/signalr/app-hub";
import { createConversation } from "@/services/chat";
import { getMomentById } from "@/services/moment";
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
          setPendingMoment(res.data.firstImage);
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
      await appHub.sendMessage({ conversationId, content: text, messageType: 0, replyToId: null, idempotencyKey: crypto.randomUUID(), momentId });
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
    <div className="flex flex-col h-[calc(100dvh-8rem)]">
      <div className="flex items-center gap-3 p-3 border-b border-border">
        <button onClick={() => router.back()} className="p-1 hover:bg-muted rounded"><ArrowLeft className="w-5 h-5" /></button>
        <p className="font-semibold">{name}</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <p className="text-sm text-muted-foreground mb-4">Bắt đầu cuộc trò chuyện với {name}</p>
        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
      </div>
      <div className="border-t border-border">
        {pendingMomentLoading ? (
          <div className="h-20 w-20 animate-pulse rounded-lg bg-muted mx-3 mt-3" />
        ) : pendingMoment ? (
          <div className="relative mx-3 mt-3 inline-block">
            <img
              src={pendingMoment.thumbUrl}
              alt=""
              className="h-20 w-20 rounded-lg object-cover"
            />
            <button
              onClick={() => setPendingMoment(null)}
              className="absolute -right-2 -top-2 rounded-full bg-background p-0.5 shadow"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <div className="flex items-center gap-2 p-3">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Nhập tin nhắn..." className="flex-1 rounded-full bg-muted px-4 py-2 text-sm outline-none" disabled={sending} />
          <button onClick={handleSend} disabled={(!input.trim() && !pendingMoment) || sending} className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}