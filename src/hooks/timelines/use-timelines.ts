import { useState, useEffect, useCallback, useRef } from "react";
import { getMyTimelines, getUserTimelines } from "@/services/timeline";
import type { TimelineDto } from "@/types/timeline";

export const useTimelines = (userId: number | null = null, take = 10) => {
  const [data, setData] = useState<TimelineDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const prevIdRef = useRef<number | null>(null);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  const fetchPage = useCallback(
    async (prevId: number | null) => {
      return userId != null ? getUserTimelines(userId, prevId, take) : getMyTimelines(prevId, take);
    },
    [userId, take],
  );

  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      const result = await fetchPage(prevIdRef.current);
      setData((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        return [...prev, ...result.data.filter((t) => !existingIds.has(t.id))];
      });
      setHasMore(result.hasMore);
      prevIdRef.current = result.prevId;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch timelines"));
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoading, isLoadingMore, hasMore, fetchPage]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setData([]);
    setHasMore(true);
    prevIdRef.current = null;
    fetchPage(null)
      .then((result) => {
        if (cancelled) return;
        setData(result.data);
        setHasMore(result.hasMore);
        prevIdRef.current = result.prevId;
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("Failed to fetch timelines"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPage, refreshKey]);

  return { data, isLoading, isLoadingMore, error, hasMore, refetch, loadMore };
};
