"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setMessages, prependMessages, appendMessage, setActiveConversation, resetUnreadCount, setConversationBlocked, setConversationUnblocked } from "@/store/slices/chat-slice";
import { getMessages, getConversation, blockChatUser, unblockChatUser } from "@/services/chat";
import { searchGiphy, type GiphyItem } from "@/services/giphy";
import { getMomentById, getMomentThumbnail } from "@/services/moment";
import { MomentDetailOverlay } from "@/components/moments/moment-detail-overlay";
import { MessageBubble } from "@/components/chat/message-bubble";
import { appHub } from "@/lib/signalr/app-hub";
import { useAuth } from "@/providers/auth-provider";
import { ArrowLeft, Send, Ban, ShieldOff, X, Smile, Loader2 } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import type { MessageDto, ImageDto } from "@/types/chat";
import { MessageType, toChatMessageRenderType } from "@/types/chat";

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
  const [viewMomentId, setViewMomentId] = useState<number | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGiphyPicker, setShowGiphyPicker] = useState(false);
  const [giphyTab, setGiphyTab] = useState<"gif" | "sticker">("gif");
  const [giphyQuery, setGiphyQuery] = useState("");
  const [giphyResults, setGiphyResults] = useState<GiphyItem[]>([]);
  const [giphyLoading, setGiphyLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());
  const typingSentRef = useRef(false);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messages = useAppSelector((s) => s.chat.messages[conversationId] ?? []);
  const hasMore = useAppSelector((s) => s.chat.messageHasMore[conversationId] ?? false);
  const prevIdRef = useRef<number | null>(null);

  const fetchMessages = useCallback(async (prevId: number | null = null) => {
    try {
      const res = await getMessages(conversationId, prevId, 20);
      if (prevId === null) {
        dispatch(setMessages({ conversationId, messages: res.data.reverse(), hasMore: res.hasMore }));
      } else {
        dispatch(prependMessages({ conversationId, messages: res.data.reverse(), hasMore: res.hasMore }));
      }
      prevIdRef.current = res.prevId;
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  }, [conversationId, dispatch]);

  useEffect(() => {
    if (momentIdParam) {
      getMomentById(momentIdParam)
        .then((res) => {
          if (res.success && res.data) {
            setPendingMoment(getMomentThumbnail(res.data));
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
      fetchMessages(),
    ]).finally(() => setLoading(false));
    appHub.joinConversation(conversationId).catch(console.error);
    return () => {
      if (typingSentRef.current) {
        typingSentRef.current = false;
        appHub.sendTyping(conversationId, false).catch(() => {});
      }
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      dispatch(setActiveConversation(null));
      appHub.leaveConversation(conversationId).catch(console.error);
    };
  }, [conversationId, dispatch, fetchMessages]);

  useEffect(() => {
    const unsub = appHub.onReceiveTyping((data) => {
      if (data.conversationId !== conversationId) return;
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (data.isTyping) {
          next.set(data.userId, data.userName);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    });
    return unsub;
  }, [conversationId]);

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
    if (hasMore) {
      fetchMessages(prevIdRef.current);
    }
  }, [hasMore, fetchMessages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if ((!text && !pendingMoment) || sending || isBlocked) return;
    if (typingSentRef.current) {
      typingSentRef.current = false;
      appHub.sendTyping(conversationId, false).catch(() => {});
    }
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
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
      inputRef.current?.focus();
    }
  }, [input, sending, conversationId, isBlocked, pendingMoment, momentIdParam]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isBlocked) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInput(text);
    const hasText = text.trim().length > 0;
    if (hasText && !typingSentRef.current && !isBlocked) {
      typingSentRef.current = true;
      appHub.sendTyping(conversationId, true).catch(() => {});
    }
    if (!hasText && typingSentRef.current) {
      typingSentRef.current = false;
      appHub.sendTyping(conversationId, false).catch(() => {});
    }
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    if (hasText) {
      typingStopTimerRef.current = setTimeout(() => {
        if (typingSentRef.current) {
          typingSentRef.current = false;
          appHub.sendTyping(conversationId, false).catch(() => {});
        }
      }, 1500);
    }
  }, [conversationId, isBlocked]);

  const sendMessageByType = useCallback(async (content: string, messageType: number) => {
    if (isBlocked || sending) return;
    setSending(true);
    try {
      await appHub.sendMessage({ conversationId, content, messageType, replyToId: null, idempotencyKey: crypto.randomUUID(), momentId: undefined });
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setSending(false);
    }
  }, [conversationId, isBlocked, sending]);

  const handleSendEmoji = useCallback((emoji: string) => {
    setShowEmojiPicker(false);
    sendMessageByType(emoji, MessageType.Emoji);
  }, [sendMessageByType]);

  const handleSendGiphy = useCallback((item: GiphyItem) => {
    setShowGiphyPicker(false);
    sendMessageByType(item.url, giphyTab === "sticker" ? MessageType.Sticker : MessageType.Gif);
  }, [sendMessageByType, giphyTab]);

  const fetchGiphy = useCallback(async (q: string, tab: "gif" | "sticker") => {
    setGiphyLoading(true);
    try {
      setGiphyResults(await searchGiphy(q, tab));
    } catch (err) {
      console.error("Failed to fetch giphy", err);
      setGiphyResults([]);
    } finally {
      setGiphyLoading(false);
    }
  }, []);

  const handleToggleEmojiPicker = useCallback(() => {
    setShowEmojiPicker((v) => !v);
  }, []);

  const handleToggleGiphyPicker = useCallback(() => {
    setShowGiphyPicker((v) => !v);
    if (!showGiphyPicker) fetchGiphy(giphyQuery, giphyTab);
  }, [showGiphyPicker, giphyQuery, giphyTab, fetchGiphy]);

  const handleGiphyTabChange = useCallback((tab: "gif" | "sticker") => {
    setGiphyTab(tab);
    if (showGiphyPicker) fetchGiphy(giphyQuery, tab);
  }, [showGiphyPicker, giphyQuery, fetchGiphy]);

  const handleGiphySearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    fetchGiphy(giphyQuery, giphyTab);
  }, [giphyQuery, giphyTab, fetchGiphy]);

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
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden pb-16">
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
          const isSystem = toChatMessageRenderType(msg.type) === "System";
          return (
            <div key={msg.id} className={`flex gap-2 ${isSystem ? "justify-center" : isMe ? "justify-end" : "justify-start"}`}>
              {!isMe && !isSystem && (
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
                {!isMe && !isSystem && <p className="text-[11px] font-medium text-muted-foreground mb-0.5 ml-1">{msg.senderName}</p>}
                <MessageBubble msg={msg} isMe={isMe} onViewMoment={(id) => setViewMomentId(id)} />
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
        <div className="relative border-t border-border">
          {typingUsers.size > 0 && (
            <div className="flex items-center gap-1.5 px-4 pt-2 text-xs text-muted-foreground">
              <span className="flex gap-0.5">
                <span className="h-1 w-1 animate-bounce rounded-full bg-current" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:0.15s]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:0.3s]" />
              </span>
              <span>{Array.from(typingUsers.values()).join(", ")} đang nhập...</span>
            </div>
          )}
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

          {showEmojiPicker && (
            <div className="absolute bottom-full left-3 z-50 mb-2">
              <div className="rounded-xl border border-border bg-background shadow-lg">
                <EmojiPicker
                  onEmojiClick={(emojiData) => handleSendEmoji(emojiData.emoji)}
                  width={300}
                  height={320}
                />
              </div>
            </div>
          )}

          {showGiphyPicker && (
            <div className="absolute bottom-full left-3 z-50 mb-2 w-[min(90vw,340px)] overflow-hidden rounded-xl border border-border bg-background shadow-lg">
              <form onSubmit={handleGiphySearch} className="flex items-center gap-1.5 border-b border-border p-2">
                <div className="flex shrink-0 rounded-full bg-muted p-0.5">
                  <button
                    type="button"
                    onClick={() => handleGiphyTabChange("gif")}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${giphyTab === "gif" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                  >
                    GIF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGiphyTabChange("sticker")}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${giphyTab === "sticker" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                  >
                    Sticker
                  </button>
                </div>
                <input
                  value={giphyQuery}
                  onChange={(e) => setGiphyQuery(e.target.value)}
                  placeholder="Tìm kiếm..."
                  className="flex-1 rounded-full bg-muted px-3 py-1.5 text-sm outline-none"
                />
              </form>
              <div className="grid max-h-64 grid-cols-3 gap-1 overflow-y-auto p-2">
                {giphyLoading ? (
                  <div className="col-span-3 flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : giphyResults.length === 0 ? (
                  <p className="col-span-3 py-8 text-center text-xs text-muted-foreground">
                    Không tìm thấy {giphyTab === "sticker" ? "sticker" : "GIF"}
                  </p>
                ) : (
                  giphyResults.map((item) => (
                    <button key={item.id} onClick={() => handleSendGiphy(item)} className="overflow-hidden rounded-lg">
                      <img src={item.thumbUrl} alt="" className="h-16 w-full object-cover" loading="lazy" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 p-3">
            <button onClick={handleToggleEmojiPicker} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted" aria-label="Biểu tượng cảm xúc">
              <Smile className="h-5 w-5" />
            </button>
            <button onClick={handleToggleGiphyPicker} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-muted-foreground hover:bg-muted" aria-label="GIF & Sticker">
              GIF
            </button>
            <input ref={inputRef} value={input} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder="Nhập tin nhắn..." className="flex-1 rounded-full bg-muted px-4 py-2 text-sm outline-none" />
            <button onClick={handleSend} disabled={(!input.trim() && !pendingMoment) || sending} className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <MomentDetailOverlay
        momentId={viewMomentId}
        currentUserId={user?.id}
        onClose={() => setViewMomentId(null)}
      />
    </div>
  );
}

