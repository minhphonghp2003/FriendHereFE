"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setConversations,
  addConversations,
  updateConversationState,
  removeConversation,
} from "@/store/slices/chat-slice";
import {
  getConversations,
  setConversationMuted,
  setConversationArchived,
  deleteChat,
} from "@/services/chat";
import { appHub } from "@/lib/signalr/app-hub";
import { useAuth } from "@/providers/auth-provider";
import {
  MessageCircle,
  Ban,
  UserPlus,
  MoreVertical,
  BellOff,
  Bell,
  Archive,
  ArchiveRestore,
  Trash2,
  Lock,
  Loader2,
  Users,
} from "lucide-react";
import type { ConversationDto, DiscoverableGroupDto } from "@/types/chat";
import { getMessagePreview, toChatMessageRenderType, JoinRequestStatus } from "@/types/chat";
import { handleApiError } from "@/lib/axios";
import type { AxiosError } from "axios";
import {
  useDiscoverableGroups,
  useCreateJoinRequest,
  useJoinGroup,
  useCancelJoinRequest,
} from "@/hooks/chat";
import { LoadingVideo } from "@/components/common/loading-video";

type ChatTab = "all" | "archived" | "discover";

const getNameDisplay = (name: string) => {
  const cleaned = name.trim();
  return cleaned.length > 4 ? cleaned.slice(0, 4) : cleaned;
};

export default function V2ChatPage() {
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

  const {
    groups: discoverableGroups,
    isLoading: loadingDiscoverable,
    error: discoverableError,
    refetch: refetchDiscoverable,
  } = useDiscoverableGroups();
  const { mutate: createRequest, isLoading: requesting } = useCreateJoinRequest();
  const { mutate: joinGroup, isLoading: joining } = useJoinGroup();
  const { mutate: cancelRequest, isLoading: cancelling } = useCancelJoinRequest();
  const [localPendingIds, setLocalPendingIds] = useState<Set<number>>(new Set());

  const inbox = conversations.filter((c) => !c.isArchived);
  const archived = conversations.filter((c) => c.isArchived);
  const visible = tab === "all" ? inbox : archived;

  const fetchConversations = useCallback(
    async (prevId: number | null = null) => {
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
    },
    [dispatch],
  );

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
    return () => {
      unsubBlocked();
      unsubUnblocked();
    };
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

  const handleChatClick = useCallback(
    (conv: ConversationDto) => {
      if (conv.id) {
        router.push(`/chat/${conv.id}`);
      }
    },
    [router],
  );

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

  const toggleMute = useCallback(
    async (conv: ConversationDto) => {
      const id = conv.id;
      if (!id) return;
      const next = !conv.isMuted;
      dispatch(updateConversationState({ conversationId: id, patch: { isMuted: next } }));
      try {
        await setConversationMuted(id, next);
      } catch (err) {
        dispatch(updateConversationState({ conversationId: id, patch: { isMuted: !next } }));
      } finally {
        setMenuState(null);
      }
    },
    [dispatch],
  );

  const toggleArchive = useCallback(
    async (conv: ConversationDto) => {
      const id = conv.id;
      if (!id) return;
      const next = !conv.isArchived;
      dispatch(updateConversationState({ conversationId: id, patch: { isArchived: next } }));
      try {
        await setConversationArchived(id, next);
      } catch (err) {
        dispatch(updateConversationState({ conversationId: id, patch: { isArchived: !next } }));
      } finally {
        setMenuState(null);
      }
    },
    [dispatch],
  );

  const handleDelete = useCallback(
    async (conv: ConversationDto) => {
      const id = conv.id;
      if (!id) return;
      if (
        !window.confirm(
          "Delete conversation? If you are the group owner, the conversation will be permanently deleted for all members. This action cannot be undone.",
        )
      ) {
        setMenuState(null);
        return;
      }
      try {
        await deleteChat(id);
        dispatch(removeConversation(id));
      } catch (err) {
        console.error("Failed to delete conversation", err);
      } finally {
        setMenuState(null);
      }
    },
    [dispatch],
  );

  const handleJoinGroup = useCallback(
    async (group: DiscoverableGroupDto) => {
      try {
        if (group.isRestricted) {
          await createRequest(group.id);
          setLocalPendingIds((prev) => new Set(prev).add(group.id));
          refetchDiscoverable();
        } else {
          await joinGroup(group.id);
          refetchDiscoverable();
        }
      } catch (err) {
        console.error("Failed to join group", err);
      }
    },
    [createRequest, joinGroup, refetchDiscoverable],
  );

  const handleCancelRequest = useCallback(
    async (group: DiscoverableGroupDto) => {
      const requestId = group.joinRequestId;
      if (!requestId) return;
      try {
        await cancelRequest(requestId);
        setLocalPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(group.id);
          return next;
        });
        refetchDiscoverable();
      } catch (err) {
        console.error("Failed to cancel request", err);
      }
    },
    [cancelRequest, refetchDiscoverable],
  );

  const renderRow = (conv: ConversationDto) => {
    const menuOpen = menuState?.convId === conv.id;
    const lastPreview = getMessagePreview(conv.lastMessage);
    const isSystem = conv.lastMessage
      ? toChatMessageRenderType(conv.lastMessage.type) === "System"
      : false;
    const preview = !lastPreview
      ? "No messages yet"
      : !isSystem && !conv.isDirect && conv.lastMessage && conv.lastMessage.senderId !== user?.id
        ? `${conv.lastMessage.senderName}: ${lastPreview}`
        : lastPreview;
    return (
      <div
        key={conv.id}
        onClick={() => handleChatClick(conv)}
        className="hover:bg-muted/50 flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors"
      >
        <div className="relative shrink-0">
          <div className="bg-muted flex h-12 w-12 items-center justify-center overflow-hidden rounded-full">
            {conv.image?.thumbUrl ? (
              <img src={conv.image.thumbUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-muted-foreground text-lg font-bold">
                {conv.name?.charAt(0).toUpperCase() ?? "?"}
              </span>
            )}
          </div>
          {conv.isOnline && (
            <div className="absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-zinc-900" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 truncate font-semibold">
              <span className="truncate">{conv.name}</span>
              {conv.isMuted && <BellOff className="text-muted-foreground h-3.5 w-3.5 shrink-0" />}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              {conv.isBlocked && <Ban className="h-3.5 w-3.5 shrink-0 text-red-500" />}
              {(conv.unreadCount ?? 0) > 0 && (
                <span className="bg-primary min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-xs text-white">
                  {conv.unreadCount}
                </span>
              )}
            </div>
          </div>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {conv.isBlocked ? "Blocked" : preview}
          </p>
        </div>
        <button
          onClick={(e) => (menuOpen ? closeMenu() : openMenu(e, conv))}
          className="hover:bg-muted text-muted-foreground shrink-0 rounded-full p-1.5"
          aria-label="Conversation options"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpen && menuState && (
          <>
            <div
              className="fixed inset-0 z-20"
              onClick={(e) => {
                e.stopPropagation();
                closeMenu();
              }}
            />
            <div
              className="bg-background border-border fixed z-30 w-44 rounded-xl border p-1 shadow-lg"
              style={{ left: menuState.x, top: menuState.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => toggleMute(conv)}
                className="hover:bg-muted flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm"
              >
                {conv.isMuted ? (
                  <Bell className="h-4 w-4 shrink-0" />
                ) : (
                  <BellOff className="h-4 w-4 shrink-0" />
                )}
                {conv.isMuted ? "Unmute" : "Mute"}
              </button>
              <button
                onClick={() => toggleArchive(conv)}
                className="hover:bg-muted flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm"
              >
                {conv.isArchived ? (
                  <ArchiveRestore className="h-4 w-4 shrink-0" />
                ) : (
                  <Archive className="h-4 w-4 shrink-0" />
                )}
                {conv.isArchived ? "Unarchive" : "Archive"}
              </button>
              <div className="border-border my-1 border-t" />
              <button
                onClick={() => handleDelete(conv)}
                className="hover:bg-muted flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-red-600"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                Delete conversation
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <h1 className="p-4 pb-0 text-2xl font-bold">Messages</h1>
        <div className="flex flex-1 items-center justify-center">
          <LoadingVideo size="md" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-4 pb-2">
        <h1 className="text-2xl font-bold">Messages</h1>
        <button
          onClick={() => router.push("/chat/new-group")}
          aria-label="Create group chat"
          className="hover:bg-muted rounded-full p-2"
        >
          <UserPlus className="h-5 w-5" />
        </button>
      </div>
      <div className="flex items-center gap-2 px-4 pb-2">
        <button
          onClick={() => {
            setTab("all");
            setMenuState(null);
          }}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab === "all" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
        >
          All
        </button>
        <button
          onClick={() => {
            setTab("archived");
            setMenuState(null);
          }}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab === "archived" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
        >
          Archived
        </button>
        <button
          onClick={() => {
            setTab("discover");
            setMenuState(null);
          }}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab === "discover" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
        >
          Discover
        </button>
      </div>
      <div ref={listRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 pb-4">
        {tab === "discover" ? (
          <>
            {loadingDiscoverable && discoverableGroups.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <LoadingVideo size="sm" />
              </div>
            ) : discoverableError ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <p className="text-muted-foreground text-sm">{discoverableError.message}</p>
                <button
                  onClick={refetchDiscoverable}
                  className="bg-success hover:bg-success/90 text-success-foreground rounded-full px-4 py-1.5 text-sm font-medium"
                >
                  Retry
                </button>
              </div>
            ) : discoverableGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                <Users className="mb-3 h-12 w-12" />
                <p className="text-sm">No groups to join</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {discoverableGroups.map((group) => {
                  const status = group.joinRequestStatus ?? null;
                  const isPending =
                    status === JoinRequestStatus.Pending || localPendingIds.has(group.id);
                  const canCancel = isPending && !!group.joinRequestId;
                  const processing = requesting || joining || (canCancel && cancelling);
                  return (
                    <div
                      key={group.id}
                      className="border-border flex items-center gap-3 rounded-lg border p-3"
                    >
                      <div className="bg-muted text-muted-foreground flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold">
                        {group.image?.thumbUrl ? (
                          <img
                            src={group.image.thumbUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getNameDisplay(group.name)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                          <span className="truncate">{group.name}</span>
                          {group.isRestricted && (
                            <Lock className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                          )}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {group.memberCount} members
                        </p>
                      </div>
                      {isPending ? (
                        <button
                          onClick={() => handleCancelRequest(group)}
                          disabled={cancelling}
                          className="border-border text-muted-foreground hover:bg-muted shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium disabled:opacity-50"
                        >
                          {cancelling ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Cancel"
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoinGroup(group)}
                          disabled={processing}
                          className="bg-success hover:bg-success/90 text-success-foreground shrink-0 rounded-full px-4 py-1.5 text-sm font-medium disabled:opacity-50"
                        >
                          {processing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : group.isRestricted ? (
                            status === JoinRequestStatus.Rejected ? (
                              "Request again"
                            ) : (
                              "Request"
                            )
                          ) : (
                            "Join"
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
                <MessageCircle className="mb-3 h-12 w-12" />
                <p className="text-sm">
                  {tab === "all"
                    ? "No messages yet"
                    : "No archived conversations yet"}
                </p>
              </div>
            )}
            {visible.map((conv) => renderRow(conv))}
            {loadingMore && (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
