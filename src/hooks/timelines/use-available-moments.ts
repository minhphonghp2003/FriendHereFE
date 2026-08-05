import { useState, useEffect, useCallback, useRef } from "react";
import { getAvailableMoments } from "@/services/moment";
import type { MomentDto } from "@/types/moment";

export const useAvailableMoments = (fromDate: string | null, toDate: string | null, take = 50) => {
  const [data, setData] = useState<MomentDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const prevIdRef = useRef<number | null>(null);

  const hasRange = !!fromDate && !!toDate;

  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore || !fromDate || !toDate) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      const result = await getAvailableMoments(fromDate, toDate, prevIdRef.current, take);
      setData((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        return [...prev, ...result.data.filter((m) => !existingIds.has(m.id))];
      });
      setHasMore(result.hasMore);
      prevIdRef.current = result.prevId;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch available moments"));
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoading, isLoadingMore, hasMore, fromDate, toDate, take]);

  useEffect(() => {
    if (!fromDate || !toDate) {
      setData([]);
      setHasMore(false);
      prevIdRef.current = null;
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setData([]);
    setHasMore(false);
    prevIdRef.current = null;
    getAvailableMoments(fromDate, toDate, null, take)
      .then((result) => {
        if (cancelled) return;
        setData(result.data);
        setHasMore(result.hasMore);
        prevIdRef.current = result.prevId;
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("Failed to fetch available moments"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate, take]);

  return { data, isLoading, isLoadingMore, error, hasMore, hasRange, loadMore };
};
