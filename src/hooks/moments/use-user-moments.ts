import { useState, useEffect, useCallback, useRef } from "react";
import { getUserMoments } from "@/services/moment";
import { appHub } from "@/lib/signalr/app-hub";
import { applyFileMarkedSuccess } from "@/lib/moments";
import type { MomentDto } from "@/types/moment";

export const useUserMoments = (userId: number, skip = 0, take = 10) => {
  const [data, setData] = useState<MomentDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const prevUserIdRef = useRef(userId);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    const userIdChanged = prevUserIdRef.current !== userId;
    prevUserIdRef.current = userId;

    if (userIdChanged) {
      setData([]);
    }

    if (!userId) return;

    const fetchMoments = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getUserMoments(userId, skip, take);
        setData((prev) => (userIdChanged ? result.data : [...prev, ...result.data]));
        setTotalCount(result.totalCount);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch user moments"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMoments();
  }, [userId, skip, take, refreshKey]);

  useEffect(() => {
    return appHub.onReceiveFileMarkedSuccess((file) => {
      setData((prev) => applyFileMarkedSuccess(prev, file));
    });
  }, []);

  return { data, isLoading, error, totalCount, refetch };
};
