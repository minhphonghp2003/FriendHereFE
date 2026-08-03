"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { X } from "lucide-react";
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
    <div className="fixed inset-0 z-[60] flex items-end">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full rounded-t-2xl bg-background px-4 pb-8 pt-4 shadow-lg">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Cảm xúc</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : reactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No reactions</p>
        ) : (
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto"
          >
            {reactions.map((r) => (
              <div key={r.userId} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-bold text-muted-foreground">
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
                  <span className="text-sm font-medium">{r.userName}</span>
                  <div className="flex gap-1">
                    {r.emojis.map((emoji, i) => (
                      <span key={i} className="text-base">{emoji}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {loadingMore && (
              <p className="py-2 text-center text-xs text-muted-foreground">Loading...</p>
            )}
            {!loadingMore && !hasMore && (
              <p className="py-2 text-center text-xs text-muted-foreground">Đã hiển thị tất cả</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
