"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setMessages, prependMessages, appendMessage, setActiveConversation, resetUnreadCount } from "@/store/slices/chat-slice";
import { getMessages, getConversation } from "@/services/chat";
import { appHub } from "@/lib/signalr/app-hub";
import { useAuth } from "@/providers/auth-provider";
import { isBlockedStatus } from "@/types/friendship";
import { ArrowLeft, Send } from "lucide-react";
import type { MessageDto } from "@/types/chat";

export default function ChatScreenPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const conversationId = Number(params.id);
  const [convName, setConvName] = useState("Chat");
  const [convOnline, setConvOnline] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
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
    Promise.all([
      getConversation(conversationId).then((res) => {
        if (res.data) {
          setConvName(res.data.name);
          setConvOnline(res.data.isOnline);
        }
      }).catch(() => {}),
      fetchMessages(0),
    ]).finally(() => setLoading(false));
    appHub.joinConversation(conversationId).catch(console.error);
    return () => {
      dispatch(setActiveConversation(null));
      appHub.leaveConversation(conversationId).catch(console.error);
    };
  }, [conversationId, dispatch, fetchMessages]);

  useEffect(() => {
    const cb = (message: MessageDto) => {
      if (message.conversationId === conversationId) {
        dispatch(appendMessage({ conversationId, message }));
      }
    };
    return appHub.onReceiveMessage(cb);
  }, [conversationId, dispatch]);

  const opponentId = useMemo(() => {
    if (!user) return null;
    const otherMessages = messages.filter((m) => m.senderId !== user.id);
    if (otherMessages.length > 0) return otherMessages[0].senderId;
    return null;
  }, [messages, user]);

  useEffect(() => {
    if (!opponentId || !user) return;

    const unsub = appHub.onReceiveFriendshipBlocked((dto) => {
      const otherId = dto.user1Id === user.id ? dto.user2Id : dto.user1Id;
      if (otherId === opponentId && isBlockedStatus(dto)) {
        setIsBlocked(true);
      }
    });

    return unsub;
  }, [opponentId, user]);

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
    if (!text || sending || isBlocked) return;
    setSending(true);
    setInput("");
    try {
      await appHub.sendMessage({ conversationId, content: text, messageType: 0, replyToId: null, idempotencyKey: crypto.randomUUID() });
    } catch (err) {
      console.error("Failed to send message", err);
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [input, sending, conversationId, isBlocked]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isBlocked) { e.preventDefault(); handleSend(); }
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
          <p className="font-semibold truncate">{convName}</p>
          <p className={`text-xs ${convOnline ? "text-emerald-500" : "text-zinc-400"}`}>
            {convOnline ? "Online" : "Offline"}
          </p>
        </div>
      </div>
      <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Chưa có tin nhắn. Hãy gửi tin nhắn đầu tiên!</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.id;
          return (
            <div key={msg.id} className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
              {!isMe && (
                <div className="shrink-0 self-end">
                  {msg.senderAvatar?.thumbUrl ? (
                    <img src={msg.senderAvatar.thumbUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {msg.senderName?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                  )}
                </div>
              )}
              <div className={`max-w-[75%] ${isMe ? "text-right" : ""}`}>
                {!isMe && <p className="text-[11px] font-medium text-muted-foreground mb-0.5 ml-1">{msg.senderName}</p>}
                <div className={`rounded-2xl px-4 py-2 ${isMe ? "bg-blue-600 text-white rounded-br-md" : "bg-muted rounded-bl-md"}`}>
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className="text-[10px] mt-1 opacity-70 text-right">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      {isBlocked ? (
        <div className="flex items-center justify-center p-3 border-t border-border bg-muted/50">
          <p className="text-sm text-muted-foreground">Không thể gửi tin nhắn. Cuộc trò chuyện đã bị chặn.</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 border-t border-border">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Nhập tin nhắn..." className="flex-1 rounded-full bg-muted px-4 py-2 text-sm outline-none" disabled={sending} />
          <button onClick={handleSend} disabled={!input.trim() || sending} className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}