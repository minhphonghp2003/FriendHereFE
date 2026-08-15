"use client";

import { useState, useRef, TouchEvent } from "react";
import { ChevronUp, Users, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { getOpponentConversation } from "@/services/chat";
import type { ActiveUserDto } from "@/lib/signalr/types";

interface V2FriendsSheetProps {
  nearbyFriends: ActiveUserDto[];
  myLocation: { lat: number; lng: number } | undefined;
  /** Open the unified user detail dialog (same as marker tap) */
  onUserTap?: (userId: number) => void;
  /** Called when the sheet opens — parent should close any open modals */
  onSheetOpen?: () => void;
}

export function V2FriendsSheet({ nearbyFriends, myLocation, onUserTap, onSheetOpen }: V2FriendsSheetProps) {
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(80);
  const [touchStart, setTouchStart] = useState(0);
  const [touchCurrent, setTouchCurrent] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [chatLoadingId, setChatLoadingId] = useState<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  
  const maxSheetHeight = typeof window !== 'undefined' ? window.innerHeight - 100 : 400;
  const minSheetHeight = 80;

  const openSheet = () => {
    setSheetHeight(maxSheetHeight);
    setIsSheetOpen(true);
    // Opening the sheet dismisses any open modal behind it
    onSheetOpen?.();
  };

  const closeSheet = () => {
    setSheetHeight(minSheetHeight);
    setIsSheetOpen(false);
  };

  const handleTouchStart = (e: TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY);
    setTouchCurrent(e.targetTouches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    
    const currentY = e.targetTouches[0].clientY;
    setTouchCurrent(currentY);
    
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 667;
    const newHeight = windowHeight - currentY;
    
    const constrainedHeight = Math.max(minSheetHeight, Math.min(maxSheetHeight, newHeight));
    setSheetHeight(constrainedHeight);
  };

  const handleTouchEnd = () => {
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

  // Calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${Math.round(distance)}km`;
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
              <span className="sheet-count">{nearbyFriends.length} friends nearby</span>
            </div>
            <ChevronUp 
              className={cn("sheet-chevron", isSheetOpen && "sheet-chevron-rotated")} 
              size={20} 
            />
          </div>
        </div>

        {/* Sheet Content — fades in as the sheet is swiped up */}
        <div
          className="sheet-content"
          style={{
            opacity: openProgress,
            transition: isDragging ? 'none' : 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            pointerEvents: openProgress < 0.5 ? 'none' : 'auto',
          }}
        >
          <div className="friends-scroll">
            {nearbyFriends.map((friend) => (
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
                    <span className="friend-card-distance">
                      {myLocation
                        ? `${calculateDistance(
                            myLocation.lat,
                            myLocation.lng,
                            friend.latitude,
                            friend.longitude,
                          )} away`
                        : "Unknown distance"}
                    </span>
                    {friend.status && (
                      <>
                        <span className="friend-card-meta-dot">·</span>
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
            ))}
            
            {nearbyFriends.length === 0 && (
              <div className="empty-state">
                <Users className="empty-icon" />
                <p className="empty-text">No friends nearby</p>
                <p className="empty-subtext">Share your location to see friends</p>
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
          touch-action: pan-y;
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

        .friends-scroll {
          height: 100%;
          overflow-y: auto;
          padding: 0 16px 24px;
          -webkit-overflow-scrolling: touch;
        }

        .friends-scroll::-webkit-scrollbar {
          display: none;
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
        }

        .friend-card:active {
          background: rgba(255, 255, 255, 0.08);
        }

        .friend-card {
          cursor: pointer;
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
