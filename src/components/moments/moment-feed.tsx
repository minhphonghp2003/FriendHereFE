"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingVideo } from "@/components/common/loading-video";
import { MomentCard } from "./moment-card";
import { useFeedMoments } from "@/hooks/moments";

const PAGE_TAKE = 10;
const LOAD_MORE_THRESHOLD = 8;

interface MomentFeedProps {
  currentUserId?: number;
  onMomentDeleted?: (id: number) => void;
  onMomentHidden?: (id: number) => void;
}

export const MomentFeed = ({ currentUserId, onMomentDeleted, onMomentHidden }: MomentFeedProps) => {
  const { data: moments, isLoading, isLoadingMore, error, hasMore, refetch, loadMore } =
    useFeedMoments(PAGE_TAKE);
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

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background text-center">
        <p className="text-sm text-muted-foreground">Không thể tải khoảnh khắc</p>
        <Button variant="outline" size="sm" onClick={refetch} className="mt-2">
          Thử lại
        </Button>
      </div>
    );
  }

  if (moments.length === 0 && !isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background text-center">
        <p className="text-sm text-muted-foreground">Chưa có khoảnh khắc nào</p>
      </div>
    );
  }

  if (moments.length === 0 && isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <LoadingVideo size="md" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full snap-y snap-mandatory overflow-y-scroll"
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
      <div className="flex h-16 w-full shrink-0 items-center justify-center bg-background">
        {isLoadingMore && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        {!hasMore && moments.length > 0 && (
          <p className="text-xs text-muted-foreground">Đã hiển thị tất cả</p>
        )}
      </div>
    </div>
  );
};