"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  ArrowLeft,
} from "lucide-react";
import {
  useDiscoverableGroups,
  useCreateJoinRequest,
  useJoinGroup,
  useCancelJoinRequest,
} from "@/hooks/chat";
import { LoadingVideo } from "@/components/common/loading-video";
import {
  JoinRequestStatus,
  toChatMessageRenderType,
  getMessagePreview,
  type ConversationDto,
  type DiscoverableGroupDto,
} from "@/types/chat";

const PAGE_TAKE = 20;
const getNameDisplay = (name?: string | null) =>
  name?.trim()?.charAt(0)?.toUpperCase() ?? "?";

type Tab = "all" | "archived" | "discover";

interface MenuState {
  convId: number;
  x: number;
  y: number;
}

export default function V2ChatPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const conversations = useAppSelector((s) => s.chat.conversations);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [menuState, setMenuState] = useState<MenuState | null>(null);

  // ===== Discoverable groups (v1 hooks) =====
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

  const listRef = useRef<HTMLDivElement>(null);

  // ===== v2 chrome: hide header + nav button while on this page =====
  useEffect(() => {
    window.dispatchEvent(new Event("v2:close-modals"));
    window.dispatchEvent(new Event("v2:sheet-open")); // hides the nav button
    window.dispatchEvent(new Event("v2:compose-open")); // hides the header
    return () => {
      window.dispatchEvent(new Event("v2:sheet-close"));
      window.dispatchEvent(new Event("v2:compose-close"));
    };
  }, []);

  const loadConversations = useCallback(async (prevId?: number) => {
    try {
      const res = await getConversations(prevId, PAGE_TAKE);
      if (prevId) {
        dispatch(addConversations({ data: res.data, hasMore: res.hasMore }));
      } else {
        dispatch(setConversations({ data: res.data, hasMore: res.hasMore }));
      }
    } catch (err) {
      console.error("Failed to fetch conversations", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Realtime block/unblock (same as v1 list)
  useEffect(() => {
    const unsubBlock = appHub.onReceiveChatBlocked(() => loadConversations());
    const unsubUnblock = appHub.onReceiveChatUnblocked(() => loadConversations());
    return () => {
      unsubBlock();
      unsubUnblock();
    };
  }, [loadConversations]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el || loadingMore || tab === "discover") return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) {
      const last = conversations[conversations.length - 1];
      if (last?.id) {
        setLoadingMore(true);
        loadConversations(last.id);
      }
    }
  };

  const handleChatClick = (conv: ConversationDto) => {
    if (!conv.id) return;
    router.push(`/chat/${conv.id}`);
  };

  const toggleMute = async (conv: ConversationDto) => {
    if (!conv.id) return;
    try {
      await setConversationMuted(conv.id, !conv.isMuted);
      dispatch(
        updateConversationState({ conversationId: conv.id, patch: { isMuted: !conv.isMuted } }),
      );
    } catch (err) {
      console.error("Failed to mute conversation", err);
    } finally {
      setMenuState(null);
    }
  };

  const toggleArchive = async (conv: ConversationDto) => {
    if (!conv.id) return;
    try {
      await setConversationArchived(conv.id, !conv.isArchived);
      dispatch(
        updateConversationState({ conversationId: conv.id, patch: { isArchived: !conv.isArchived } }),
      );
    } catch (err) {
      console.error("Failed to archive conversation", err);
    } finally {
      setMenuState(null);
    }
  };

  const handleDelete = useCallback(
    async (conv: ConversationDto) => {
      const id = conv.id;
      if (!id) return;
      if (
        !window.confirm(
          "Xóa cuộc trò chuyện? Nếu bạn là chủ nhóm, cuộc trò chuyện sẽ bị xóa vĩnh viễn với tất cả thành viên. Hành động này không thể hoàn tác.",
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
        } else {
          await joinGroup(group.id);
        }
        refetchDiscoverable();
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

  const openMenu = (e: React.MouseEvent, conv: ConversationDto) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuState({ convId: conv.id!, x: Math.min(rect.left - 120, window.innerWidth - 190), y: rect.bottom + 4 });
  };

  const closeMenu = () => setMenuState(null);

  const renderRow = (conv: ConversationDto) => {
    const menuOpen = menuState?.convId === conv.id;
    const lastPreview = getMessagePreview(conv.lastMessage);
    const isSystem = conv.lastMessage
      ? toChatMessageRenderType(conv.lastMessage.type) === "System"
      : false;
    const preview = !lastPreview
      ? "Chưa có tin nhắn"
      : !isSystem && !conv.isDirect && conv.lastMessage && conv.lastMessage.senderId !== user?.id
        ? `${conv.lastMessage.senderName}: ${lastPreview}`
        : lastPreview;
    return (
      <div
        key={conv.id}
        onClick={() => handleChatClick(conv)}
        className="vc2-row"
      >
        <div className="vc2-avatar-wrap">
          <div className="vc2-avatar">
            {conv.image?.thumbUrl ? (
              <img src={conv.image.thumbUrl} alt="" className="vc2-avatar-img" />
            ) : (
              <span className="vc2-avatar-letter">{getNameDisplay(conv.name)}</span>
            )}
          </div>
          {conv.isOnline && <div className="vc2-online-dot" />}
        </div>
        <div className="vc2-row-body">
          <div className="vc2-row-top">
            <p className="vc2-name">
              <span className="vc2-name-text">{conv.name}</span>
              {conv.isMuted && <BellOff className="vc2-muted-icon" />}
            </p>
            <div className="vc2-row-badges">
              {conv.isBlocked && <Ban className="vc2-blocked-icon" />}
              {(conv.unreadCount ?? 0) > 0 && (
                <span className="vc2-unread">{conv.unreadCount}</span>
              )}
            </div>
          </div>
          <p className="vc2-preview">{conv.isBlocked ? "Đã chặn" : preview}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            menuOpen ? closeMenu() : openMenu(e, conv);
          }}
          className="vc2-menu-btn"
          aria-label="Tùy chọn cuộc trò chuyện"
        >
          <MoreVertical className="vc2-menu-icon" />
        </button>

        {menuOpen && menuState && (
          <>
            <div
              className="vc2-menu-backdrop"
              onClick={(e) => {
                e.stopPropagation();
                closeMenu();
              }}
            />
            <div
              className="vc2-menu"
              style={{ left: menuState.x, top: menuState.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => toggleMute(conv)} className="vc2-menu-item">
                {conv.isMuted ? <Bell className="vc2-menu-item-icon" /> : <BellOff className="vc2-menu-item-icon" />}
                {conv.isMuted ? "Bật thông báo" : "Tắt thông báo"}
              </button>
              <button onClick={() => toggleArchive(conv)} className="vc2-menu-item">
                {conv.isArchived ? <ArchiveRestore className="vc2-menu-item-icon" /> : <Archive className="vc2-menu-item-icon" />}
                {conv.isArchived ? "Bỏ lưu trữ" : "Lưu trữ"}
              </button>
              <div className="vc2-menu-divider" />
              <button onClick={() => handleDelete(conv)} className="vc2-menu-item danger">
                <Trash2 className="vc2-menu-item-icon" />
                Xóa cuộc trò chuyện
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  const visible = conversations.filter((c) => (tab === "archived" ? c.isArchived : !c.isArchived));

  const isLoadingView =
    (tab !== "discover" && loading) ||
    (tab === "discover" && loadingDiscoverable && discoverableGroups.length === 0);

  return (
    <div className="vc2-page">
      <div className="vc2-header">
        <button
          onClick={() => router.push("/location")}
          className="vc2-back-btn"
          aria-label="Quay lại"
        >
          <ArrowLeft className="vc2-back-icon" />
        </button>
        <h1 className="vc2-title">Tin nhắn</h1>
        <button
          onClick={() => router.push("/chat/new-group")}
          aria-label="Tạo nhóm chat"
          className="vc2-new-group-btn"
        >
          <UserPlus className="vc2-new-group-icon" />
        </button>
      </div>

      <div className="vc2-tabs">
        {(["all", "archived", "discover"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setMenuState(null);
            }}
            className={`vc2-tab ${tab === t ? "active" : ""}`}
          >
            {t === "all" ? "Tất cả" : t === "archived" ? "Đã lưu trữ" : "Khám phá"}
          </button>
        ))}
      </div>

      <div ref={listRef} onScroll={handleScroll} className="vc2-list">
        {isLoadingView ? (
          <div className="vc2-loading-overlay">
            <LoadingVideo size="md" />
          </div>
        ) : tab === "discover" ? (
          <>
            {discoverableError ? (
              <div className="vc2-center-block">
                <p className="vc2-empty-text">{discoverableError.message}</p>
                <button onClick={() => refetchDiscoverable()} className="vc2-retry-btn">
                  Thử lại
                </button>
              </div>
            ) : discoverableGroups.length === 0 ? (
              <div className="vc2-center-block">
                <Users className="vc2-empty-icon" />
                <p className="vc2-empty-text">Không có nhóm để tham gia</p>
              </div>
            ) : (
              <div className="vc2-groups">
                {discoverableGroups.map((group) => {
                  const status = group.joinRequestStatus ?? null;
                  const isPending =
                    status === JoinRequestStatus.Pending || localPendingIds.has(group.id);
                  const canCancel = isPending && !!group.joinRequestId;
                  const processing = requesting || joining || (canCancel && cancelling);
                  return (
                    <div key={group.id} className="vc2-group-card">
                      <div className="vc2-avatar sm">
                        {group.image?.thumbUrl ? (
                          <img src={group.image.thumbUrl} alt="" className="vc2-avatar-img" />
                        ) : (
                          <span className="vc2-avatar-letter">{getNameDisplay(group.name)}</span>
                        )}
                      </div>
                      <div className="vc2-row-body">
                        <p className="vc2-name">
                          <span className="vc2-name-text">{group.name}</span>
                          {group.isRestricted && <Lock className="vc2-muted-icon" />}
                        </p>
                        <p className="vc2-preview">{group.memberCount} thành viên</p>
                      </div>
                      {isPending ? (
                        <button
                          onClick={() => handleCancelRequest(group)}
                          disabled={cancelling}
                          className="vc2-ghost-btn"
                        >
                          {cancelling ? <Loader2 className="vc2-spin" /> : "Hủy"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoinGroup(group)}
                          disabled={processing}
                          className="vc2-primary-btn"
                        >
                          {processing ? (
                            <Loader2 className="vc2-spin" />
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
            {visible.length === 0 ? (
              <div className="vc2-center-block">
                <MessageCircle className="vc2-empty-icon" />
                <p className="vc2-empty-text">
                  {tab === "all" ? "Chưa có tin nhắn" : "Chưa có cuộc trò chuyện nào được lưu trữ"}
                </p>
              </div>
            ) : (
              <>
                {visible.map((conv) => renderRow(conv))}
                {loadingMore && (
                  <div className="vc2-center-block slim">
                    <Loader2 className="vc2-spin" />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <style jsx global>{`
        .vc2-page {
          position: relative;
          height: 100%;
          width: 100%;
          display: flex;
          flex-direction: column;
          /* Gradient-primary theme matching chat box and moments pages
             (lighter base + stronger teal glow) */
          background:
            radial-gradient(circle at 15% 20%, rgba(43, 176, 175, 0.5), transparent 55%),
            radial-gradient(circle at 85% 85%, rgba(43, 176, 175, 0.4), transparent 55%),
            #13181d;
          color: var(--vm-text, #18181b);
        }

        .vc2-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 12px 16px 4px;
          padding-top: calc(12px + env(safe-area-inset-top, 0px));
        }

        .vc2-title {
          font-size: 24px;
          font-weight: 800;
          margin: 0;
          flex: 1;
          text-align: center;
        }

        .vc2-back-btn,
        .vc2-new-group-btn {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          border: none;
          border-radius: 50%;
          background: var(--vm-surface, #fff);
          color: #2bb0af;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
          transition: transform 0.2s;
        }

        .vc2-back-btn:active,
        .vc2-new-group-btn:active {
          transform: scale(0.92);
        }

        .vc2-back-icon,
        .vc2-new-group-icon {
          width: 18px;
          height: 18px;
        }

        .vc2-tabs {
          display: flex;
          gap: 8px;
          padding: 8px 20px 10px;
        }

        .vc2-tab {
          border: 1px solid var(--vm-border, #e4e4e7);
          background: var(--vm-surface, #fff);
          color: var(--vm-text-2, #52525b);
          border-radius: 999px;
          padding: 6px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .vc2-tab.active {
          background: linear-gradient(135deg, #2bb0af 0%, #1a8a89 100%);
          border-color: transparent;
          color: white;
          box-shadow: 0 4px 14px rgba(43, 176, 175, 0.4);
        }

        .vc2-list {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 4px 12px calc(16px + env(safe-area-inset-bottom, 0px));
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .vc2-row,
        .vc2-group-card {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 8px;
          border-radius: 14px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .vc2-row:active {
          background: rgba(43, 176, 175, 0.08);
        }

        .vc2-group-card {
          border: 1px solid var(--vm-border, #e4e4e7);
          background: var(--vm-surface, #fff);
          margin-bottom: 8px;
        }

        .vc2-avatar-wrap {
          position: relative;
          flex-shrink: 0;
        }

        .vc2-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--vm-surface-2, #f4f4f5);
          flex-shrink: 0;
        }

        .vc2-avatar.sm {
          width: 44px;
          height: 44px;
        }

        .vc2-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .vc2-avatar-letter {
          font-size: 17px;
          font-weight: 800;
          color: var(--vm-text-2, #52525b);
        }

        .vc2-online-dot {
          position: absolute;
          right: 0;
          bottom: 0;
          width: 13px;
          height: 13px;
          border-radius: 50%;
          background: #22c55e;
          border: 2.5px solid var(--vm-bg, #f4f4f5);
        }

        .vc2-row-body {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .vc2-row-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .vc2-name {
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: var(--vm-text, #18181b);
          min-width: 0;
        }

        .vc2-name-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .vc2-muted-icon {
          width: 13px;
          height: 13px;
          flex-shrink: 0;
          color: var(--vm-text-3, #a1a1aa);
        }

        .vc2-row-badges {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .vc2-blocked-icon {
          width: 13px;
          height: 13px;
          color: #ef4444;
        }

        .vc2-unread {
          background: #2bb0af;
          color: white;
          font-size: 11px;
          font-weight: 800;
          min-width: 19px;
          height: 19px;
          padding: 0 5px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .vc2-preview {
          margin: 0;
          font-size: 13px;
          color: var(--vm-text-3, #a1a1aa);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .vc2-menu-btn {
          width: 30px;
          height: 30px;
          border: none;
          background: none;
          color: var(--vm-text-3, #a1a1aa);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }

        .vc2-menu-icon {
          width: 17px;
          height: 17px;
        }

        .vc2-menu-backdrop {
          position: fixed;
          inset: 0;
          z-index: 20;
        }

        .vc2-menu {
          position: fixed;
          z-index: 30;
          width: 180px;
          background: var(--vm-surface, #fff);
          border: 1px solid var(--vm-border, #e4e4e7);
          border-radius: 14px;
          padding: 4px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
        }

        .vc2-menu-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border: none;
          background: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          color: var(--vm-text, #18181b);
          cursor: pointer;
          text-align: left;
        }

        .vc2-menu-item:active {
          background: var(--vm-surface-2, #f4f4f5);
        }

        .vc2-menu-item.danger {
          color: #ef4444;
        }

        .vc2-menu-item-icon {
          width: 15px;
          height: 15px;
        }

        .vc2-menu-divider {
          height: 1px;
          background: var(--vm-border, #e4e4e7);
          margin: 4px 6px;
        }

        .vc2-center-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 32px 20px;
        }

        /* Perfectly centered loading overlay (independent of list scroll) */
        .vc2-loading-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .vc2-center-block.slim {
          flex: 0 0 auto;
          padding: 14px;
        }

        .vc2-empty-icon {
          width: 46px;
          height: 46px;
          color: var(--vm-text-3, #a1a1aa);
          opacity: 0.6;
        }

        .vc2-empty-text {
          margin: 0;
          font-size: 14px;
          color: var(--vm-text-3, #a1a1aa);
        }

        .vc2-retry-btn {
          border: none;
          border-radius: 999px;
          padding: 7px 18px;
          font-size: 13px;
          font-weight: 700;
          color: white;
          background: linear-gradient(135deg, #2bb0af 0%, #1a8a89 100%);
          cursor: pointer;
        }

        .vc2-groups {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-top: 4px;
        }

        .vc2-primary-btn {
          border: none;
          border-radius: 999px;
          padding: 7px 16px;
          font-size: 13px;
          font-weight: 700;
          color: white;
          background: linear-gradient(135deg, #2bb0af 0%, #1a8a89 100%);
          cursor: pointer;
          flex-shrink: 0;
        }

        .vc2-primary-btn:disabled {
          opacity: 0.6;
        }

        .vc2-ghost-btn {
          border: 1px solid var(--vm-border, #e4e4e7);
          border-radius: 999px;
          padding: 7px 16px;
          font-size: 13px;
          font-weight: 700;
          color: var(--vm-text-2, #52525b);
          background: var(--vm-surface, #fff);
          cursor: pointer;
          flex-shrink: 0;
        }

        .vc2-ghost-btn:disabled {
          opacity: 0.6;
        }

        .vc2-spin {
          width: 16px;
          height: 16px;
          animation: vc2-rotate 1s linear infinite;
        }

        @keyframes vc2-rotate {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
