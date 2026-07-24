"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setMessages, prependMessages, appendMessage, setActiveConversation, resetUnreadCount } from "@/store/slices/chat-slice";
import { getMessages } from "@/services/chat";
import { appHub } from "@/lib/signalr/app-hub";
import { ArrowLeft, Send } from "lucide-react";
import type { MessageDto } from "@/types/chat";

export default function ChatScreenPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const conversationId = Number(params.id);
  const name = searchParams.get("name") ?? "Chat";
  const isOnline = searchParams.get("isOnline") === "true";
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messages = useAppSelector((s) => s.chat.messages[conversationId] ?? []);
  const totalCount = useAppSelector((s) => s.chat.messageTotalCount[conversationId] ?? 0);

  const fetchMessages = useCallback(async (skip = 0) => {
    try {
      const res = await getMessages(conversationId, skip, 20);
      if (skip === 0) {
        dispatch(setMessages({ conversationId, messages: res.data.reverse(), totalCount: res.totalCount }));
      } else {
        dispatch(prependMessages({ conversationId, messages: res.data.reverse(), totalCount: res.totalCount }));
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  }, [conversationId, dispatch]);

  useEffect(() => {
    dispatch(setActiveConversation(conversationId));
    dispatch(resetUnreadCount(conversationId));
    setLoading(true);
    fetchMessages(0).finally(() => setLoading(false));
    appHub.joinConversation(conversationId).catch(console.error);
    return () => {
      dispatch(setActiveConversation(null));
      appHub.leaveConversation(conversationId).catch(console.error);
    };
  }, [conversationId, dispatch, fetchMessages]);

  useEffect(() => {
    const cb = (message: MessageDto) => {
      const msgConvId = (message as any).conversationId ?? conversationId;
      if (msgConvId === conversationId) {
        dispatch(appendMessage({ conversationId, message }));
      }
    };
    appHub.onReceiveMessage(cb);
  }, [conversationId, dispatch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el || el.scrollTop > 0) return;
    if (messages.length < totalCount) {
      fetchMessages(messages.length);
    }
  }, [messages.length, totalCount, fetchMessages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      await appHub.sendMessage({ conversationId, receiverId: null, content: text, messageType: 0, replyToId: null });
    } catch (err) {
      console.error("Failed to send message", err);
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [input, sending, conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-4rem)]">
        <div className="w-6 h-6 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)]">
      <div className="flex items-center gap-3 p-3 border-b border-border">
        <button onClick={() => router.back()} className="p-1 hover:bg-muted rounded">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{name}</p>
          <p className={`text-xs ${isOnline ? "text-emerald-500" : "text-zinc-400"}`}>
            {isOnline ? "Online" : "Offline"}
          </p>
        </div>
      </div>
      <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Chưa có tin nhắn. Hãy gửi tin nhắn đầu tiên!</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.senderId === (typeof window !== "undefined" ? Number(localStorage.getItem("user_id")) : -1) ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.senderId === (typeof window !== "undefined" ? Number(localStorage.getItem("user_id")) : -1) ? "bg-blue-600 text-white rounded-br-md" : "bg-muted rounded-bl-md"}`}>
              <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
              <p className="text-[10px] mt-1 opacity-70 text-right">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex items-center gap-2 p-3 border-t border-border">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Nhập tin nhắn..." className="flex-1 rounded-full bg-muted px-4 py-2 text-sm outline-none" disabled={sending} />
        <button onClick={handleSend} disabled={!input.trim() || sending} className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}