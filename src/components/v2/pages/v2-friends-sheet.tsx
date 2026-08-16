"use client";

import { useState, useRef, useCallback, useEffect, type TouchEvent } from "react";
import { ChevronUp, Users, MessageCircle, Loader2, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { LoadingVideo } from "@/components/common/loading-video";
import { getOpponentConversation } from "@/services/chat";
import { useActiveUsers } from "@/hooks/location/use-active-users";
import { LOCATION_SORT, type LocationSort } from "@/services/location";
import { useAppSelector } from "@/store/hooks";
import type { ActiveUserDto } from "@/lib/signalr/types";

interface V2FriendsSheetProps {
  /** Open the unified user detail dialog (same as marker tap) */
  onUserTap?: (userId: number) => void;
  /** Called when the sheet opens — parent should close any open modals */
  onSheetOpen?: () => void;
}

const PAGE_TAKE = 20;

export function V2FriendsSheet({ onUserTap, onSheetOpen }: V2FriendsSheetProps) {
  const router = useRouter();
  const myUserId = useAppSelector((s) => s.auth.user?.id);

  // Sort mode: distance (server-sorted) or default (null)
  const [sortBy, setSortBy] = useState<LocationSort | undefined>(LOCATION_SORT.Distance);

  // v1 service: GET /Location/active (paginated; sortBy toggles distance/default)
  const {
    data: activeUsers,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useActiveUsers(PAGE_TAKE, sortBy);

  // Exclude myself
  const nearbyFriends = activeUsers.filter((u) => u.userId !== myUserId);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(80);
  const [isDragging, setIsDragging] = useState(false);
  const [chatLoadingId, setChatLoadingId] = useState<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Gesture bookkeeping: startY + whether the gesture became a sheet drag
  const gestureRef = useRef<{ startY: number; dragging: boolean } | null>(null);

  const maxSheetHeight = typeof window !== 'undefined' ? window.innerHeight - 100 : 400;
  const minSheetHeight = 80;

  const openSheet = useCallback(() => {
    setSheetHeight(maxSheetHeight);
    setIsSheetOpen(true);
    // Opening the sheet dismisses any open modal + moves the nav button down.
    // NOTE: we dispatch "v2:close-modals" — the sheet itself must NOT react to
    // that event (only to "v2:force-close-sheet"), or it would close itself.
    window.dispatchEvent(new Event("v2:close-modals"));
    window.dispatchEvent(new Event("v2:sheet-open"));
    onSheetOpen?.();
  }, [maxSheetHeight, onSheetOpen]);

  const closeSheet = useCallback(() => {
    setSheetHeight(minSheetHeight);
    setIsSheetOpen(false);
    window.dispatchEvent(new Event("v2:sheet-close"));
  }, []);

  // Force-close (e.g. kicked) — a dedicated event so opening the sheet (which
  // broadcasts v2:close-modals to dismiss dialogs) never closes itself.
  useEffect(() => {
    const handler = () => closeSheet();
    window.addEventListener("v2:force-close-sheet", handler);
    return () => window.removeEventListener("v2:force-close-sheet", handler);
  }, [closeSheet]);

  // ---- Handle drag gestures ----
  const handleTouchStart = (e: TouchEvent) => {
    gestureRef.current = { startY: e.targetTouches[0].clientY, dragging: true };
    setIsDragging(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    const gesture = gestureRef.current;
    if (!gesture || !gesture.dragging) return;

    const currentY = e.targetTouches[0].clientY;
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 667;
    const newHeight = windowHeight - currentY;
    const constrainedHeight = Math.max(minSheetHeight, Math.min(maxSheetHeight, newHeight));
    setSheetHeight(constrainedHeight);
  };

  const handleTouchEnd = () => {
    gestureRef.current = null;
    setIsDragging(false);

    const midpoint = (maxSheetHeight + minSheetHeight) / 2;
    if (sheetHeight > midpoint) {
      openSheet();
    } else {
      closeSheet();
    }
  };

  // Content-area gesture: the list scrolls natively EXCEPT when it's at the very
  // top and the finger moves DOWN — then the sheet collapses. Direction is
  // detected on the first significant move so upward swipes always scroll.
  const contentTouchStart = (e: TouchEvent) => {
    const scrollEl = scrollRef.current;
    const atTop = !scrollEl || scrollEl.scrollTop <= 0;
    gestureRef.current = {
      startY: e.targetTouches[0].clientY,
      dragging: atTop, // only eligible to drag when the list is at its top
    };
  };

  const contentTouchMove = (e: TouchEvent) => {
    const gesture = gestureRef.current;
    if (!gesture) return;

    const currentY = e.targetTouches[0].clientY;
    const delta = currentY - gesture.startY;

    if (!gesture.dragging) return;

    if (!isDragging) {
      // Decide the gesture intent on the first ~8px of movement:
      // downward (delta > 0) => sheet drag; upward => native list scroll
      if (delta > 8) {
        setIsDragging(true);
      } else if (delta < -8) {
        gesture.dragging = false; // release to the list
        return;
      } else {
        return; // too small to decide
      }
    }

    // If the list somehow scrolled, stop dragging and let it scroll
    const scrollEl = scrollRef.current;
    if (scrollEl && scrollEl.scrollTop > 0) {
      gesture.dragging = false;
      setIsDragging(false);
      return;
    }

    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 667;
    const newHeight = windowHeight - currentY;
    const constrainedHeight = Math.max(minSheetHeight, Math.min(maxSheetHeight, newHeight));
    setSheetHeight(constrainedHeight);
  };

  const contentTouchEnd = () => {
    const wasDragging = isDragging;
    gestureRef.current = null;
    if (!wasDragging) return;
    setIsDragging(false);

    const midpoint = (maxSheetHeight + minSheetHeight) / 2;
    if (sheetHeight > midpoint) {
      openSheet();
    } else {
      closeSheet();
    }
  };

  const toggleSheet = () => {
    if (isSheetOpen) {
      closeSheet();
    } else {
      openSheet();
    }
  };

  // Infinite scroll: fetch more when near the bottom
  const handleListScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isLoading || isLoadingMore || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
      loadMore();
    }
  }, [isLoading, isLoadingMore, hasMore, loadMore]);

  // Sorting re-runs the query (sortBy is in the hook's dep array)
  const toggleSort = () => {
    setSortBy((current) => (current ? undefined : LOCATION_SORT.Distance));
  };

  // Distance label: prefer the server-computed distance from /Location/active
  const formatDistance = (u: ActiveUserDto): string => {
    const d = u.distance;
    if (d == null) return "";
    return d < 1000 ? `${Math.round(d)}m` : `${(d / 1000).toFixed(1)}km`;
  };

  // v1 MarkerDetail logic: find existing conversation or create a new one
  const handleChat = async (e: React.MouseEvent, userId: number, name: string) => {
    e.stopPropagation();
    if (chatLoadingId !== null) return;
    setChatLoadingId(userId);
    try {
      const res = await getOpponentConversation(userId);
      if (res.data) {
        router.push(`/chat/${res.data}`);
      } else {
        router.push(`/chat/new?receiverId=${userId}&name=${encodeURIComponent(name)}`);
      }
    } catch {
      router.push(`/chat/new?receiverId=${userId}&name=${encodeURIComponent(name)}`);
    } finally {
      setChatLoadingId(null);
    }
  };

  // Drag progress 0..1 (collapsed -> fully open) drives content opacity
  const openProgress = Math.min(
    1,
    Math.max(0, (sheetHeight - minSheetHeight) / (maxSheetHeight - minSheetHeight)),
  );

  return (
    <>

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="location-bottom-sheet"
        style={{
          height: `${sheetHeight}px`,
          transition: isDragging ? 'none' : 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Drag Handle */}
        <div
          className="sheet-drag-handle"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={toggleSheet}
        >
          <div className="drag-indicator" />
          <div className="sheet-preview">
            <div className="sheet-preview-info">
              <Users className="sheet-icon" />
              <span className="sheet-count">
                {isLoading
                  ? "Loading..."
                  : `${nearbyFriends.length} friends nearby`}
              </span>
            </div>
            <div className="sheet-preview-actions">
              {/* Sort toggle: distance (server) / default */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSort();
                }}
                className={cn("sheet-sort-btn", sortBy && "sheet-sort-btn-active")}
                aria-label={sortBy ? "Sắp xếp theo khoảng cách" : "Sắp xếp mặc định"}
                title={sortBy ? "Sắp xếp theo khoảng cách" : "Sắp xếp mặc định"}
              >
                <Navigation className="sheet-sort-icon" />
              </button>
              <ChevronUp
                className={cn("sheet-chevron", isSheetOpen && "sheet-chevron-rotated")}
                size={20}
              />
            </div>
          </div>
        </div>

        {/* Sheet Content — fades in as the sheet is swiped up.
            Draggable from anywhere: at list top, a downward swipe collapses
            the sheet; everything else scrolls the list natively. */}
        <div
          className="sheet-content sheet-content-draggable"
          style={{
            opacity: openProgress,
            transition: isDragging ? 'none' : 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            pointerEvents: openProgress < 0.5 ? 'none' : 'auto',
          }}
          onTouchStart={contentTouchStart}
          onTouchMove={contentTouchMove}
          onTouchEnd={contentTouchEnd}
        >
          <div
            className="friends-scroll"
            ref={scrollRef}
            onScroll={handleListScroll}
          >
            {nearbyFriends.map((friend) => {
              const distanceLabel = formatDistance(friend);
              return (
                <div
                  key={friend.userId}
                  className="friend-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => onUserTap?.(friend.userId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onUserTap?.(friend.userId);
                  }}
                >
                  <div className="friend-card-avatar">
                    {friend.image ? (
                      <img
                        src={friend.image}
                        alt={friend.name}
                        className="friend-card-image"
                      />
                    ) : (
                      <div className="friend-card-placeholder">
                        {friend.name?.charAt(0) || "?"}
                      </div>
                    )}
                    <div className="friend-status online" />
                  </div>

                  <div className="friend-card-info">
                    <h4 className="friend-card-name">{friend.name}</h4>
                    <div className="friend-card-meta">
                      {distanceLabel && (
                        <span className="friend-card-distance">{distanceLabel} away</span>
                      )}
                      {friend.status && (
                        <>
                          {distanceLabel && <span className="friend-card-meta-dot">·</span>}
                          <span className="friend-card-status">{friend.status}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Trailing message button (v1 chat logic) */}
                  <button
                    onClick={(e) => handleChat(e, friend.userId, friend.name)}
                    disabled={chatLoadingId === friend.userId}
                    className="friend-card-chat-btn"
                    aria-label={`Message ${friend.name}`}
                  >
                    <MessageCircle className="friend-card-chat-icon" fill="currentColor" />
                  </button>
                </div>
              );
            })}

            {/* Infinite scroll loader */}
            {isLoadingMore && (
              <div className="friends-list-loading">
                <Loader2 className="friends-list-loading-icon" />
              </div>
            )}

            {!hasMore && nearbyFriends.length > 0 && (
              <p className="friends-list-end">Đã hiển thị tất cả</p>
            )}

            {isLoading && nearbyFriends.length === 0 && (
              <div className="friends-list-loading">
                <LoadingVideo size="sm" />
              </div>
            )}

            {!isLoading && nearbyFriends.length === 0 && (
              <div className="empty-state">
                <Users className="empty-icon" />
                <p className="empty-text">Không có bạn bè ở gần</p>
                <p className="empty-subtext">Chia sẻ vị trí để xem bạn bè</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .sheet-trigger-btn {
          position: fixed;
          bottom: 100px;
          left: 20px;
          z-index: 40;
          width: 56px;
          height: 56px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          background: rgba(20, 20, 20, 0.8);
          backdrop-filter: blur(30px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 28px;
          color: white;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: float-in 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .trigger-icon {
          width: 24px;
          height: 24px;
        }

        .trigger-count {
          font-size: 11px;
          font-weight: 600;
        }

        @keyframes float-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .sheet-trigger-btn:hover {
          transform: scale(1.05);
          background: rgba(20, 20, 20, 0.9);
        }

        .sheet-trigger-btn:active {
          transform: scale(0.95);
        }

        /* Bottom Sheet — z-index 40: below shadcn dialogs (z-50) so user detail
           modals render above the sheet, but above the map */
        .location-bottom-sheet {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 40;
          background: rgba(20, 20, 20, 0.92);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border-radius: 24px 24px 0 0;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          overflow: hidden;
          box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.4);
        }

        .sheet-drag-handle {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 16px;
          cursor: grab;
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
        }

        .sheet-drag-handle:active {
          cursor: grabbing;
        }

        .drag-indicator {
          width: 40px;
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.25);
          margin-bottom: 10px;
        }

        .sheet-preview {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 4px 4px;
        }

        .sheet-preview-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sheet-sort-btn {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 50%;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          padding: 0;
          transition: all 0.2s;
        }

        .sheet-sort-btn:hover {
          background: rgba(255, 255, 255, 0.14);
          color: white;
        }

        .sheet-sort-btn-active {
          background: rgba(43, 176, 175, 0.2);
          border-color: rgba(43, 176, 175, 0.5);
          color: #2BB0AF;
        }

        .sheet-sort-btn-active .sheet-sort-icon {
          transform: rotate(0deg);
        }

        .sheet-sort-icon {
          width: 14px;
          height: 14px;
        }

        .sheet-preview-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sheet-icon {
          width: 20px;
          height: 20px;
          color: #2BB0AF;
        }

        .sheet-count {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }

        .sheet-chevron {
          color: rgba(255, 255, 255, 0.5);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sheet-chevron-rotated {
          transform: rotate(180deg);
        }

        .sheet-content {
          height: calc(100% - 64px);
          overflow: hidden;
        }

        /* The list scrolls natively; sheet-drag gestures are JS-driven.
           pan-y keeps vertical scrolling smooth within the list. */
        .sheet-content-draggable {
          touch-action: pan-y;
        }

        .friends-scroll {
          height: 100%;
          overflow-y: auto;
          padding: 0 16px 24px;
          -webkit-overflow-scrolling: touch;
        }

        .friends-scroll::-webkit-scrollbar {
          display: none;
        }

        .friends-list-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px 0;
        }

        .friends-list-loading-icon {
          width: 20px;
          height: 20px;
          color: rgba(255, 255, 255, 0.6);
          animation: friends-sheet-spin 1s linear infinite;
        }

        @keyframes friends-sheet-spin {
          to { transform: rotate(360deg); }
        }

        .friends-list-end {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
          text-align: center;
          margin: 12px 0;
        }

        .friend-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          margin-bottom: 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          transition: background 0.2s;
          cursor: pointer;
        }

        .friend-card:active {
          background: rgba(255, 255, 255, 0.08);
        }

        .friend-card-avatar {
          position: relative;
          flex-shrink: 0;
        }

        .friend-card-image,
        .friend-card-placeholder {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          object-fit: cover;
        }

        .friend-card-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #2BB0AF 0%, #1a8a89 100%);
          font-size: 16px;
          font-weight: 600;
          color: white;
        }

        .friend-status {
          position: absolute;
          bottom: 1px;
          right: 1px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid rgba(20, 20, 20, 0.9);
        }

        .friend-status.online {
          background: #22c55e;
        }

        .friend-card-info {
          flex: 1;
          min-width: 0;
        }

        .friend-card-name {
          font-size: 13px;
          font-weight: 600;
          color: white;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .friend-card-meta {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 2px;
          min-width: 0;
        }

        .friend-card-distance {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          flex-shrink: 0;
        }

        .friend-card-meta-dot {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.3);
          flex-shrink: 0;
        }

        .friend-card-status {
          font-size: 11px;
          font-style: italic;
          color: rgba(43, 176, 175, 0.95);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
        }

        .friend-card-chat-btn {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #2BB0AF;
          border: none;
          border-radius: 50%;
          color: white;
          cursor: pointer;
          flex-shrink: 0;
          padding: 0;
          transition: all 0.2s;
        }

        .friend-card-chat-btn:hover:not(:disabled) {
          background: #1a8a89;
          transform: scale(1.08);
        }

        .friend-card-chat-btn:active {
          transform: scale(0.92);
        }

        .friend-card-chat-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .friend-card-chat-icon {
          width: 16px;
          height: 16px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          text-align: center;
        }

        .empty-icon {
          width: 40px;
          height: 40px;
          color: rgba(255, 255, 255, 0.3);
          margin-bottom: 12px;
        }

        .empty-text {
          font-size: 15px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
        }

        .empty-subtext {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.4);
          margin: 4px 0 0;
        }
      `}</style>
    </>
  );
}
