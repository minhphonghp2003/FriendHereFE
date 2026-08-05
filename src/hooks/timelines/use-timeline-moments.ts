import { useState, useEffect, useCallback, useRef } from "react";
import { getTimelineMoments } from "@/services/moment";
import type { MomentDto } from "@/types/moment";

export const useTimelineMoments = (timelineId: number, take = 10) => {
  const [data, setData] = useState<MomentDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const prevIdRef = useRef<number | null>(null);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore || !timelineId) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      const result = await getTimelineMoments(timelineId, prevIdRef.current, take);
      setData((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        return [...prev, ...result.data.filter((m) => !existingIds.has(m.id))];
      });
      setHasMore(result.hasMore);
      prevIdRef.current = result.prevId;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch timeline moments"));
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoading, isLoadingMore, hasMore, take, timelineId]);

  useEffect(() => {
    if (!timelineId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getTimelineMoments(timelineId, null, take)
      .then((result) => {
        if (cancelled) return;
        setData(result.data);
        setHasMore(result.hasMore);
        prevIdRef.current = result.prevId;
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("Failed to fetch timeline moments"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [timelineId, take, refreshKey]);

  return { data, isLoading, isLoadingMore, error, hasMore, refetch, loadMore };
};
