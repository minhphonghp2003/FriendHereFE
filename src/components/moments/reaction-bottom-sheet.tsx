"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { getMomentReactions } from "@/services/moment";
import type { GroupedReactionDto } from "@/types/moment";

interface ReactionBottomSheetProps {
  momentId: number;
  open: boolean;
  onClose: () => void;
}

export const ReactionBottomSheet = ({ momentId, open, onClose }: ReactionBottomSheetProps) => {
  const [reactions, setReactions] = useState<GroupedReactionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const prevIdRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setHasMore(true);
    prevIdRef.current = null;
    getMomentReactions(momentId)
      .then((res) => {
        if (cancelled) return;
        setReactions(res.data);
        setHasMore(res.hasMore);
        prevIdRef.current = res.prevId;
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [momentId, open]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await getMomentReactions(momentId, prevIdRef.current);
      setReactions((prev) => {
        const existingIds = new Set(prev.map((r) => r.userId));
        return [...prev, ...res.data.filter((r) => !existingIds.has(r.userId))];
      });
      setHasMore(res.hasMore);
      prevIdRef.current = res.prevId;
    } catch (err) {
      console.error("Failed to load more reactions", err);
    } finally {
      setLoadingMore(false);
    }
  }, [momentId, loading, loadingMore, hasMore]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
      loadMore();
    }
  };

  // Add keyboard escape support
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[700] flex items-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      
      {/* Sheet container */}
      <div 
        id="reaction-sheet-container"
        className="relative w-full rounded-t-2xl shadow-lg"
        style={{ 
          backgroundColor: '#13181d',
          color: '#fff'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content wrapper with padding */}
        <div className="px-4 pb-8 pt-4">
          {/* Drag handle */}
          <div 
            className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => {
              // Add basic mouse drag support
              const startY = e.clientY;
              const sheet = document.getElementById('reaction-sheet-container');
              if (!sheet) return;

              const handleMouseMove = (moveEvent: MouseEvent) => {
                const deltaY = moveEvent.clientY - startY;
                if (deltaY > 0) {
                  sheet.style.transform = `translateY(${deltaY}px)`;
                }
              };

              const handleMouseUp = (upEvent: MouseEvent) => {
                const deltaY = upEvent.clientY - startY;
                if (deltaY > 100) {
                  onClose();
                } else {
                  sheet.style.transform = '';
                }
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
            onTouchStart={(e) => {
              // Add touch drag support for mobile
              const startY = e.touches[0].clientY;
              const sheet = document.getElementById('reaction-sheet-container');
              if (!sheet) return;

              const handleTouchMove = (moveEvent: TouchEvent) => {
                const deltaY = moveEvent.touches[0].clientY - startY;
                if (deltaY > 0) {
                  sheet.style.transform = `translateY(${deltaY}px)`;
                  moveEvent.preventDefault(); // Prevent scrolling while dragging
                }
              };

              const handleTouchEnd = (endEvent: TouchEvent) => {
                const deltaY = endEvent.changedTouches[0].clientY - startY;
                if (deltaY > 100) {
                  onClose();
                } else {
                  sheet.style.transform = '';
                }
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
              };

              document.addEventListener('touchmove', handleTouchMove, { passive: false });
              document.addEventListener('touchend', handleTouchEnd);
            }}
          />
          
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">
              Cảm xúc ({reactions.length})
            </h2>
            {/* No close button as requested */}
          </div>

          {/* Body */}
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto"
          >
            {loading && reactions.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/60">Đang tải...</p>
            ) : reactions.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/60">Chưa có phản ứng</p>
            ) : (
              <>
                {reactions.map((r) => (
                  <div key={r.userId} className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-sm font-bold text-white/60">
                      {r.userImage ? (
                        <img
                          src={r.userImage.thumbUrl}
                          alt={r.userName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        r.userName.charAt(0)
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-white">{r.userName}</span>
                      <div className="flex gap-1">
                        {r.emojis.map((emoji, i) => (
                          <span key={i} className="text-base">{emoji}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {loadingMore && (
                  <div className="py-4 text-center text-sm text-white/60">
                    Đang tải thêm...
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
