"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setConversations, addConversations } from "@/store/slices/chat-slice";
import { getConversations } from "@/services/chat";
import { appHub } from "@/lib/signalr/app-hub";
import { useAuth } from "@/providers/auth-provider";
import { MessageCircle, ChevronRight, Ban } from "lucide-react";
import type { ConversationDto } from "@/types/chat";
import { getMessagePreview } from "@/types/chat";

export default function ChatListPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { conversations, conversationsHasMore } = useAppSelector((s) => s.chat);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const prevIdRef = useRef<number | null>(null);

  const fetchConversations = useCallback(async (prevId: number | null = null) => {
    try {
      const res = await getConversations(prevId, 20);
      if (prevId === null) {
        dispatch(setConversations({ data: res.data, hasMore: res.hasMore }));
      } else {
        dispatch(addConversations({ data: res.data, hasMore: res.hasMore }));
      }
      prevIdRef.current = res.prevId;
    } catch (err) {
      console.error("Failed to fetch conversations", err);
    }
  }, [dispatch]);

  useEffect(() => {
    setLoading(true);
    fetchConversations().finally(() => setLoading(false));
  }, [fetchConversations]);

  useEffect(() => {
    if (!user) return;
    const unsubBlocked = appHub.onReceiveChatBlocked(() => {
      fetchConversations();
    });
    const unsubUnblocked = appHub.onReceiveChatUnblocked(() => {
      fetchConversations();
    });
    return () => { unsubBlocked(); unsubUnblocked(); };
  }, [user, fetchConversations]);

  const handleScroll = useCallback(() => {
    if (!listRef.current || loadingMore) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      if (conversationsHasMore) {
        setLoadingMore(true);
        fetchConversations(prevIdRef.current).finally(() => setLoadingMore(false));
      }
    }
  }, [conversationsHasMore, fetchConversations, loadingMore]);

  const handleChatClick = useCallback((conv: ConversationDto) => {
    if (conv.id) {
      router.push(`/chat/${conv.id}`);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        <h1 className="text-2xl font-bold mb-2">Tin nhắn</h1>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded" />
              <div className="h-3 w-40 bg-zinc-200 dark:bg-zinc-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2">
        <h1 className="text-2xl font-bold">Tin nhắn</h1>
      </div>
      <div ref={listRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 pb-4">
        {conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <MessageCircle className="w-12 h-12 mb-3" />
            <p className="text-sm">Chưa có tin nhắn nào</p>
          </div>
        )}
        {conversations.map((conv) => (
          <button key={conv.id} onClick={() => handleChatClick(conv)} className="flex items-center gap-3 w-full py-3 text-left hover:bg-muted/50 rounded-lg px-2 transition-colors">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {conv.image?.thumbUrl ? (
                  <img src={conv.image.thumbUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-muted-foreground">{conv.name?.charAt(0).toUpperCase() ?? '?'}</span>
                )}
              </div>
              {conv.isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-semibold truncate">{conv.name}</p>
                <div className="flex items-center gap-2">
                  {conv.isBlocked && (
                    <Ban className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  )}
                  {(conv.unreadCount ?? 0) > 0 && (
                    <span className="text-xs bg-blue-600 text-white rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">{conv.unreadCount}</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {conv.isBlocked ? "Đã chặn" : (getMessagePreview(conv.lastMessage) || "Chưa có tin nhắn")}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        ))}
        {loadingMore && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
          </div>
        )}
      </div>
    </div>
  );
}