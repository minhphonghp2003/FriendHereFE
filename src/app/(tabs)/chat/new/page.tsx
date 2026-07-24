"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch } from "@/store/hooks";
import { addConversation, setActiveConversation } from "@/store/slices/chat-slice";
import { appHub } from "@/lib/signalr/app-hub";
import { ArrowLeft } from "lucide-react";

export default function NewChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const receiverId = Number(searchParams.get("receiverId"));
  const name = searchParams.get("name") ?? "";
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!receiverId) router.replace("/chat");
  }, [receiverId, router]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    try {
      await appHub.sendMessage({ conversationId: null, receiverId, content: text, messageType: 0, replyToId: null });
      setInput("");
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
      <div className="flex items-center gap-2 p-3 border-t border-border">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Nhập tin nhắn..." className="flex-1 rounded-full bg-muted px-4 py-2 text-sm outline-none" disabled={sending} />
        <button onClick={handleSend} disabled={!input.trim() || sending} className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
          Gửi
        </button>
      </div>
    </div>
  );
}
