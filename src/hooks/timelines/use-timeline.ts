import { useState, useEffect, useCallback } from "react";
import { getTimelineById } from "@/services/timeline";
import type { TimelineDto } from "@/types/timeline";

export const useTimeline = (timelineId: number | null) => {
  const [data, setData] = useState<TimelineDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!timelineId) {
      setData(null);
      setUnavailable(false);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setUnavailable(false);
    getTimelineById(timelineId)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setUnavailable(true);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setUnavailable(true);
        setError(err instanceof Error ? err : new Error("Failed to fetch timeline"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [timelineId, refreshKey]);

  return { data, isLoading, error, unavailable, refetch };
};
