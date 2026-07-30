"use client";

import { useEffect, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MomentCard } from "./moment-card";
import { useFeedMoments } from "@/hooks/moments";

interface MomentFeedProps {
  currentUserId?: number;
  onMomentDeleted?: (id: number) => void;
  onMomentHidden?: (id: number) => void;
}

export const MomentFeed = ({ currentUserId, onMomentDeleted, onMomentHidden }: MomentFeedProps) => {
  const { data: moments, isLoading, error, totalCount, refetch } = useFeedMoments(0, 10);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef(0);

  const loadMore = useCallback(async () => {
    if (isLoading || moments.length >= totalCount) return;
    skipRef.current += 10;
  }, [isLoading, moments.length, totalCount]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">Không thể tải khoảnh khắc</p>
        <Button variant="outline" size="sm" onClick={refetch} className="mt-2">
          Thử lại
        </Button>
      </div>
    );
  }

  if (moments.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">Chưa có khoảnh khắc nào</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {moments.map((moment) => (
        <MomentCard
          key={moment.id}
          moment={moment}
          currentUserId={currentUserId}
          onDelete={onMomentDeleted}
          onHide={onMomentHidden}
        />
      ))}
      <div ref={loadMoreRef} className="flex justify-center py-4">
        {isLoading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
        {!isLoading && moments.length >= totalCount && moments.length > 0 && (
          <p className="text-xs text-muted-foreground">Đã hiển thị tất cả</p>
        )}
      </div>
    </div>
  );
};
