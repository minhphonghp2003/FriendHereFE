"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setMessages, prependMessages, appendMessage, setActiveConversation, resetUnreadCount, setConversationBlocked, setConversationUnblocked } from "@/store/slices/chat-slice";
import { getMessages, getConversation, blockChatUser, unblockChatUser } from "@/services/chat";
import { getMomentById } from "@/services/moment";
import { appHub } from "@/lib/signalr/app-hub";
import { useAuth } from "@/providers/auth-provider";
import { ArrowLeft, Send, Ban, ShieldOff, X } from "lucide-react";
import type { MessageDto, ImageDto } from "@/types/chat";

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
  const [blockedById, setBlockedById] = useState<number | null>(null);
  const [opponentId, setOpponentId] = useState<number | null>(null);
  const [blocking, setBlocking] = useState(false);
  const searchParams = useSearchParams();
  const momentIdParam = searchParams.get("momentId") ? Number(searchParams.get("momentId")) : null;
  const [pendingMoment, setPendingMoment] = useState<ImageDto | null>(null);
  const [pendingMomentLoading, setPendingMomentLoading] = useState(!!momentIdParam);
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
    if (momentIdParam) {
      getMomentById(momentIdParam)
        .then((res) => {
          if (res.success && res.data) {
            setPendingMoment(res.data.firstImage);
          }
        })
        .catch(() => {})
        .finally(() => setPendingMomentLoading(false));
    }
  }, [momentIdParam]);

  useEffect(() => {
    dispatch(setActiveConversation(conversationId));
    dispatch(resetUnreadCount(conversationId));
    setLoading(true);
    Promise.all([
      getConversation(conversationId).then((res) => {
        if (res.data) {
          setConvName(res.data.name);
          setConvOnline(res.data.isOnline);
          setIsBlocked(res.data.isBlocked);
          setBlockedById(res.data.blockedById);
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

  useEffect(() => {
    if (!user || messages.length === 0) return;
    const otherMsg = messages.find((m) => m.senderId !== user.id);
    if (otherMsg) setOpponentId(otherMsg.senderId);
  }, [messages, user]);

  useEffect(() => {
    const unsubBlocked = appHub.onReceiveChatBlocked((data) => {
      if (data.targetUserId === user?.id) {
        setIsBlocked(true);
        if (opponentId) setBlockedById(opponentId);
        dispatch(setConversationBlocked({ conversationId, blockedById: opponentId ?? 0 }));
      }
    });
    const unsubUnblocked = appHub.onReceiveChatUnblocked((data) => {
      if (data.targetUserId === user?.id) {
        setIsBlocked(false);
        setBlockedById(null);
        dispatch(setConversationUnblocked(conversationId));
      }
    });
    return () => { unsubBlocked(); unsubUnblocked(); };
  }, [conversationId, user, opponentId, dispatch]);

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
    if ((!text && !pendingMoment) || sending || isBlocked) return;
    setSending(true);
    setInput("");
    try {
      await appHub.sendMessage({ conversationId, content: text, messageType: 0, replyToId: null, idempotencyKey: crypto.randomUUID(), momentId: pendingMoment ? momentIdParam : undefined });
      setPendingMoment(null);
    } catch (err) {
      console.error("Failed to send message", err);
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [input, sending, conversationId, isBlocked, pendingMoment, momentIdParam]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isBlocked) { e.preventDefault(); handleSend(); }
  };

  const handleBlock = useCallback(async () => {
    if (!opponentId || blocking) return;
    setBlocking(true);
    try {
      await blockChatUser(opponentId);
      setIsBlocked(true);
      setBlockedById(user?.id ?? null);
      dispatch(setConversationBlocked({ conversationId, blockedById: user?.id ?? 0 }));
    } catch (err) {
      console.error("Failed to block user", err);
    } finally {
      setBlocking(false);
    }
  }, [opponentId, blocking, user, conversationId, dispatch]);

  const handleUnblock = useCallback(async () => {
    if (!opponentId || blocking) return;
    setBlocking(true);
    try {
      await unblockChatUser(opponentId);
      setIsBlocked(false);
      setBlockedById(null);
      dispatch(setConversationUnblocked(conversationId));
    } catch (err) {
      console.error("Failed to unblock user", err);
    } finally {
      setBlocking(false);
    }
  }, [opponentId, blocking, conversationId, dispatch]);

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
        {isBlocked ? (
          <button onClick={handleUnblock} disabled={blocking || blockedById !== user?.id} className="p-2 rounded-full hover:bg-muted text-red-500 disabled:opacity-50 disabled:cursor-not-allowed" title="Bỏ chặn">
            <ShieldOff className="w-5 h-5" />
          </button>
        ) : (
          <button onClick={handleBlock} disabled={blocking} className="p-2 rounded-full hover:bg-muted text-red-500 disabled:opacity-50" title="Chặn người dùng">
            <Ban className="w-5 h-5" />
          </button>
        )}
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
                  {msg.momentThumbnail ? (
                    <div className="mb-1.5">
                      <img
                        src={msg.momentThumbnail.thumbUrl}
                        alt=""
                        className="h-20 w-20 rounded-lg object-cover"
                      />
                    </div>
                  ) : null}
                  {msg.content ? (
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  ) : null}
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
          {blockedById === user?.id ? (
            <p className="text-sm text-muted-foreground">Bạn đã chặn người này. Nhấn nút bỏ chặn để gửi tin nhắn.</p>
          ) : (
            <p className="text-sm text-muted-foreground">Bạn đã bị chặn. Không thể gửi tin nhắn.</p>
          )}
        </div>
      ) : (
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
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Nhập tin nhắn..." className="flex-1 rounded-full bg-muted px-4 py-2 text-sm outline-none" disabled={sending} />
            <button onClick={handleSend} disabled={(!input.trim() && !pendingMoment) || sending} className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

