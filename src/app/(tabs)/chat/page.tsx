"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setConversations, addConversations } from "@/store/slices/chat-slice";
import { getConversations } from "@/services/chat";
import { MessageCircle, ChevronRight } from "lucide-react";
import type { ConversationDto } from "@/types/chat";

export default function ChatListPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { conversations, conversationsTotalCount } = useAppSelector((s) => s.chat);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async (skip = 0) => {
    try {
      const res = await getConversations(skip, 20);
      if (skip === 0) {
        dispatch(setConversations({ data: res.data, totalCount: res.totalCount }));
      } else {
        dispatch(addConversations({ data: res.data, totalCount: res.totalCount }));
      }
    } catch (err) {
      console.error("Failed to fetch conversations", err);
    }
  }, [dispatch]);

  useEffect(() => {
    setLoading(true);
    fetchConversations(0).finally(() => setLoading(false));
  }, [fetchConversations]);

  const handleScroll = useCallback(() => {
    if (!listRef.current || loadingMore) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      if (conversations.length < conversationsTotalCount) {
        setLoadingMore(true);
        fetchConversations(conversations.length).finally(() => setLoadingMore(false));
      }
    }
  }, [conversations.length, conversationsTotalCount, fetchConversations, loadingMore]);

  const handleChatClick = useCallback((conv: ConversationDto) => {
    if (conv.id) {
      router.push(`/chat/${conv.id}?name=${encodeURIComponent(conv.name)}&isOnline=${conv.isOnline}&memberCount=${conv.memberCount ?? 2}`);
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
                {(conv.unreadCount ?? 0) > 0 && (
                  <span className="text-xs bg-blue-600 text-white rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">{conv.unreadCount}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {conv.lastMessage?.content ?? "Chưa có tin nhắn"}
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