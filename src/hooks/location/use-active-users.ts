import { useState, useEffect, useCallback, useRef } from "react";
import { getActiveUsers, type LocationSort } from "@/services/location";
import type { ActiveUserDto } from "@/lib/signalr/types";

export const useActiveUsers = (take = 10, sortBy?: LocationSort) => {
  const [data, setData] = useState<ActiveUserDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const prevIdRef = useRef<number | null>(null);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      const result = await getActiveUsers({ prevId: prevIdRef.current, take, sortBy });
      setData((prev) => {
        const existingIds = new Set(prev.map((u) => u.userId));
        return [...prev, ...result.data.filter((u) => !existingIds.has(u.userId))];
      });
      setHasMore(result.hasMore);
      prevIdRef.current = result.prevId;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch active users"));
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoading, isLoadingMore, hasMore, take, sortBy]);

  useEffect(() => {
    let cancelled = false;
    prevIdRef.current = null;
    getActiveUsers({ prevId: null, take, sortBy })
      .then((result) => {
        if (cancelled) return;
        setData(result.data);
        setHasMore(result.hasMore);
        prevIdRef.current = result.prevId;
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("Failed to fetch active users"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [take, refreshKey, sortBy]);

  return { data, isLoading, isLoadingMore, error, hasMore, refetch, loadMore };
};
