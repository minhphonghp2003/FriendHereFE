import { useState, useEffect, useCallback, useRef } from "react";
import { getFeedMoments } from "@/services/moment";
import { appHub } from "@/lib/signalr/app-hub";
import { applyFileMarkedSuccess } from "@/lib/moments";
import type { MomentDto } from "@/types/moment";

export const useFeedMoments = (skip = 0, take = 10) => {
  const [data, setData] = useState<MomentDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const prevSkipRef = useRef(skip);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    const skipChanged = prevSkipRef.current !== skip;
    prevSkipRef.current = skip;

    if (skipChanged) {
      setData([]);
    }

    const fetchMoments = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getFeedMoments(skip, take);
        setData((prev) => (skipChanged ? result.data : [...prev, ...result.data]));
        setTotalCount(result.totalCount);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch moments"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMoments();
  }, [skip, take, refreshKey]);

  useEffect(() => {
    return appHub.onReceiveFileMarkedSuccess((file) => {
      setData((prev) => applyFileMarkedSuccess(prev, file));
    });
  }, []);

  return { data, isLoading, error, totalCount, refetch };
};
