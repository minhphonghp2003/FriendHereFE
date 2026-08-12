"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setConversations, addConversations, updateConversationState, removeConversation } from "@/store/slices/chat-slice";
import { getConversations, setConversationMuted, setConversationArchived, deleteChat } from "@/services/chat";
import { appHub } from "@/lib/signalr/app-hub";
import { useAuth } from "@/providers/auth-provider";
import { MessageCircle, Ban, UserPlus, MoreVertical, BellOff, Bell, Archive, ArchiveRestore, Trash2, Lock, Loader2, Users } from "lucide-react";
import type { ConversationDto, DiscoverableGroupDto } from "@/types/chat";
import { getMessagePreview, toChatMessageRenderType, JoinRequestStatus } from "@/types/chat";
import { handleApiError } from "@/lib/axios";
import type { AxiosError } from "axios";
import { useDiscoverableGroups, useCreateJoinRequest, useJoinGroup, useCancelJoinRequest } from "@/hooks/chat";

type ChatTab = "all" | "archived" | "discover";

const getNameDisplay = (name: string) => {
  const cleaned = name.trim();
  return cleaned.length > 4 ? cleaned.slice(0, 4) : cleaned;
};

export default function ChatListPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { conversations, conversationsHasMore } = useAppSelector((s) => s.chat);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tab, setTab] = useState<ChatTab>("all");
  const [menuState, setMenuState] = useState<{ convId: number; x: number; y: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const prevIdRef = useRef<number | null>(null);

  const { groups: discoverableGroups, isLoading: loadingDiscoverable, error: discoverableError, refetch: refetchDiscoverable } = useDiscoverableGroups();
  const { mutate: createRequest, isLoading: requesting } = useCreateJoinRequest();
  const { mutate: joinGroup, isLoading: joining } = useJoinGroup();
  const { mutate: cancelRequest, isLoading: cancelling } = useCancelJoinRequest();
  const [localPendingIds, setLocalPendingIds] = useState<Set<number>>(new Set());

  const inbox = conversations.filter((c) => !c.isArchived);
  const archived = conversations.filter((c) => c.isArchived);
  const visible = tab === "all" ? inbox : archived;

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

  const openMenu = useCallback((e: React.MouseEvent, conv: ConversationDto) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuState({
      convId: conv.id ?? 0,
      x: Math.max(8, Math.min(rect.left, window.innerWidth - 184)),
      y: rect.bottom + 4,
    });
  }, []);

  const closeMenu = useCallback(() => setMenuState(null), []);

  const toggleMute = useCallback(async (conv: ConversationDto) => {
    const id = conv.id;
    if (!id) return;
    const next = !conv.isMuted;
    dispatch(updateConversationState({ conversationId: id, patch: { isMuted: next } }));
    try {
      await setConversationMuted(id, next);
      toast.success(next ? "Đã tắt thông báo" : "Đã bật thông báo");
    } catch (err) {
      dispatch(updateConversationState({ conversationId: id, patch: { isMuted: !next } }));
      toast.error(handleApiError(err as any).message || "Không thể cập nhật trạng thái thông báo");
    } finally {
      setMenuState(null);
    }
  }, [dispatch]);

  const toggleArchive = useCallback(async (conv: ConversationDto) => {
    const id = conv.id;
    if (!id) return;
    const next = !conv.isArchived;
    dispatch(updateConversationState({ conversationId: id, patch: { isArchived: next } }));
    try {
      await setConversationArchived(id, next);
      toast.success(next ? "Đã lưu trữ cuộc trò chuyện" : "Đã bỏ lưu trữ cuộc trò chuyện");
    } catch (err) {
      dispatch(updateConversationState({ conversationId: id, patch: { isArchived: !next } }));
      toast.error(handleApiError(err as any).message || "Không thể cập nhật trạng thái lưu trữ");
    } finally {
      setMenuState(null);
    }
  }, [dispatch]);

  const handleDelete = useCallback(async (conv: ConversationDto) => {
    const id = conv.id;
    if (!id) return;
    if (!window.confirm("Xóa cuộc trò chuyện? Nếu bạn là chủ nhóm, cuộc trò chuyện sẽ bị xóa vĩnh viễn cho tất cả thành viên. Hành động này không thể hoàn tác.")) {
      setMenuState(null);
      return;
    }
    try {
      await deleteChat(id);
      dispatch(removeConversation(id));
      toast.success("Đã xóa cuộc trò chuyện");
    } catch (err) {
      toast.error(handleApiError(err as any).message || "Không thể xóa cuộc trò chuyện");
    } finally {
      setMenuState(null);
    }
  }, [dispatch]);

  const handleJoinGroup = useCallback(async (group: DiscoverableGroupDto) => {
    try {
      if (group.isRestricted) {
        await createRequest(group.id);
        setLocalPendingIds((prev) => new Set(prev).add(group.id));
        refetchDiscoverable();
        toast.success(`Đã gửi yêu cầu tham gia "${group.name}"`);
      } else {
        await joinGroup(group.id);
        refetchDiscoverable();
        toast.success(`Đã tham gia "${group.name}"`);
      }
    } catch (err) {
      toast.error(handleApiError(err as AxiosError).message || "Không thể tham gia nhóm");
    }
  }, [createRequest, joinGroup, refetchDiscoverable]);

  const handleCancelRequest = useCallback(async (group: DiscoverableGroupDto) => {
    const requestId = group.joinRequestId;
    if (!requestId) {
      toast.error("Không thể hủy yêu cầu — thiếu ID yêu cầu");
      return;
    }
    try {
      await cancelRequest(requestId);
      setLocalPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(group.id);
        return next;
      });
      refetchDiscoverable();
      toast.success(`Đã hủy yêu cầu tham gia "${group.name}"`);
    } catch (err) {
      toast.error(handleApiError(err as AxiosError).message || "Không thể hủy yêu cầu");
    }
  }, [cancelRequest, refetchDiscoverable]);

  const renderRow = (conv: ConversationDto) => {
    const menuOpen = menuState?.convId === conv.id;
    const lastPreview = getMessagePreview(conv.lastMessage);
    const isSystem = conv.lastMessage ? toChatMessageRenderType(conv.lastMessage.type) === "System" : false;
    const preview = !lastPreview
      ? "Chưa có tin nhắn"
      : !isSystem && !conv.isDirect && conv.lastMessage && conv.lastMessage.senderId !== user?.id
        ? `${conv.lastMessage.senderName}: ${lastPreview}`
        : lastPreview;
    return (
      <div key={conv.id} onClick={() => handleChatClick(conv)} className="flex items-center gap-3 w-full py-3 text-left hover:bg-muted/50 rounded-lg px-2 transition-colors cursor-pointer">
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
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold truncate flex items-center gap-1.5">
              <span className="truncate">{conv.name}</span>
              {conv.isMuted && <BellOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              {conv.isBlocked && (
                <Ban className="w-3.5 h-3.5 text-red-500 shrink-0" />
              )}
              {(conv.unreadCount ?? 0) > 0 && (
                <span className="text-xs bg-blue-600 text-white rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">{conv.unreadCount}</span>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {conv.isBlocked ? "Đã chặn" : preview}
          </p>
        </div>
        <button
          onClick={(e) => (menuOpen ? closeMenu() : openMenu(e, conv))}
          className="rounded-full p-1.5 hover:bg-muted text-muted-foreground shrink-0"
          aria-label="Tùy chọn hội thoại"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {menuOpen && menuState && (
          <>
            <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); closeMenu(); }} />
            <div
              className="fixed z-30 w-44 rounded-xl bg-background shadow-lg border border-border p-1"
              style={{ left: menuState.x, top: menuState.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => toggleMute(conv)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-muted text-left"
              >
                {conv.isMuted ? <Bell className="w-4 h-4 shrink-0" /> : <BellOff className="w-4 h-4 shrink-0" />}
                {conv.isMuted ? "Bật thông báo" : "Tắt thông báo"}
              </button>
              <button
                onClick={() => toggleArchive(conv)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-muted text-left"
              >
                {conv.isArchived ? <ArchiveRestore className="w-4 h-4 shrink-0" /> : <Archive className="w-4 h-4 shrink-0" />}
                {conv.isArchived ? "Bỏ lưu trữ" : "Lưu trữ"}
              </button>
              <div className="my-1 border-t border-border" />
              <button
                onClick={() => handleDelete(conv)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-muted text-left text-red-600"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                Xóa cuộc trò chuyện
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

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
      <div className="p-4 pb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tin nhắn</h1>
        <button
          onClick={() => router.push("/chat/new-group")}
          aria-label="Tạo nhóm chat"
          className="rounded-full p-2 hover:bg-muted"
        >
          <UserPlus className="w-5 h-5" />
        </button>
      </div>
      <div className="px-4 pb-2 flex items-center gap-2">
        <button
          onClick={() => { setTab("all"); setMenuState(null); }}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab === "all" ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
        >
          Tất cả
        </button>
        <button
          onClick={() => { setTab("archived"); setMenuState(null); }}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab === "archived" ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
        >
          Đã lưu trữ
        </button>
        <button
          onClick={() => { setTab("discover"); setMenuState(null); }}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab === "discover" ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
        >
          Khám phá
        </button>
      </div>
      <div ref={listRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 pb-4">
        {tab === "discover" ? (
          <>
            {loadingDiscoverable && discoverableGroups.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : discoverableError ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <p className="text-sm text-muted-foreground">{discoverableError.message}</p>
                <button
                  onClick={refetchDiscoverable}
                  className="rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Thử lại
                </button>
              </div>
            ) : discoverableGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                <Users className="mb-3 h-12 w-12" />
                <p className="text-sm">Không có nhóm nào để tham gia</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {discoverableGroups.map((group) => {
                  const status = group.joinRequestStatus ?? null;
                  const isPending = status === JoinRequestStatus.Pending || localPendingIds.has(group.id);
                  const canCancel = isPending && !!group.joinRequestId;
                  const processing = requesting || joining || (canCancel && cancelling);
                  return (
                    <div key={group.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-bold text-muted-foreground">
                        {group.image?.thumbUrl ? (
                          <img src={group.image.thumbUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          getNameDisplay(group.name)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                          <span className="truncate">{group.name}</span>
                          {group.isRestricted && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                        </p>
                        <p className="text-xs text-muted-foreground">{group.memberCount} thành viên</p>
                      </div>
                      {isPending ? (
                        <button
                          onClick={() => handleCancelRequest(group)}
                          disabled={cancelling}
                          className="shrink-0 rounded-full border border-border px-4 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                        >
                          {cancelling ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Hủy yêu cầu"
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoinGroup(group)}
                          disabled={processing}
                          className="shrink-0 rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {processing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : group.isRestricted ? (
                            status === JoinRequestStatus.Rejected ? "Yêu cầu lại" : "Yêu cầu"
                          ) : (
                            "Tham gia"
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {visible.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                <MessageCircle className="w-12 h-12 mb-3" />
                <p className="text-sm">
                  {tab === "all" ? "Chưa có tin nhắn nào" : "Chưa có cuộc trò chuyện nào được lưu trữ"}
                </p>
              </div>
            )}
            {visible.map((conv) => renderRow(conv))}
            {loadingMore && (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
