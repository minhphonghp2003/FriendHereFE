import { useState, useEffect, useCallback } from "react";
import { getPendingJoinRequests } from "@/services/chat";
import type { JoinRequestDto } from "@/types/chat";

export const usePendingJoinRequests = (conversationId: number, open?: boolean) => {
  const [requests, setRequests] = useState<JoinRequestDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!conversationId || open === false) return;
    let cancelled = false;
    getPendingJoinRequests(conversationId)
      .then((res) => {
        if (cancelled) return;
        if (!res.success) {
          throw new Error(res.message || "Không thể tải yêu cầu tham gia");
        }
        setRequests(res.data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("Không thể tải yêu cầu tham gia"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, refreshKey, open]);

  return { requests, isLoading, error, refetch };
};
