"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { X, Loader2 } from "lucide-react";
import { MomentCard } from "./moment-card";
import { useUserMoments } from "@/hooks/moments";
import { getTodayRange } from "@/services/moment";

const PAGE_TAKE = 10;
const LOAD_MORE_THRESHOLD = 8;

interface UserMomentsOverlayProps {
  userId: number;
  currentUserId?: number;
  userName?: string;
  onClose: () => void;
  onMomentDeleted?: (id: number) => void;
  onMomentHidden?: (id: number) => void;
}

export const UserMomentsOverlay = ({
  userId,
  currentUserId,
  userName,
  onClose,
  onMomentDeleted,
  onMomentHidden,
}: UserMomentsOverlayProps) => {
  const { fromDate, toDate } = useMemo(() => getTodayRange(), []);
  const {
    data: moments,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refetch,
  } = useUserMoments(userId, PAGE_TAKE, fromDate, toDate);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(loadMore);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(true);

  const handleToggleInfo = useCallback(() => setShowInfo((v) => !v), []);

  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || el.clientHeight === 0) return;
    setCurrentIndex(Math.round(el.scrollTop / el.clientHeight));
  }, []);

  useEffect(() => {
    if (moments.length - currentIndex <= PAGE_TAKE - LOAD_MORE_THRESHOLD + 1 && hasMore) {
      loadMoreRef.current();
    }
  }, [currentIndex, moments.length, hasMore]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-20 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
        aria-label="Đóng"
      >
        <X className="h-5 w-5" />
      </button>
      {error ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-sm text-white/70">Không thể tải khoảnh khắc</p>
          <button
            onClick={refetch}
            className="mt-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
          >
            Thử lại
          </button>
        </div>
      ) : moments.length === 0 && !isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-white/70">
            {userName ? `${userName} chưa có khoảnh khắc hôm nay` : "Chưa có khoảnh khắc hôm nay"}
          </p>
        </div>
      ) : moments.length === 0 && isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      ) : (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 snap-y snap-mandatory overflow-y-scroll"
        >
          {moments.map((moment, index) => (
            <div key={moment.id} className="h-full w-full shrink-0 snap-start snap-always">
              <MomentCard
                fullscreen
                moment={moment}
                currentUserId={currentUserId}
                onDelete={onMomentDeleted}
                onHide={onMomentHidden}
                active={index === currentIndex}
                showInfo={showInfo}
                onToggleInfo={handleToggleInfo}
              />
            </div>
          ))}
          <div className="flex h-16 w-full shrink-0 items-center justify-center bg-black">
            {isLoadingMore && <Loader2 className="h-5 w-5 animate-spin text-white/70" />}
            {!hasMore && moments.length > 0 && (
              <p className="text-xs text-white/50">Đã hiển thị tất cả</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
