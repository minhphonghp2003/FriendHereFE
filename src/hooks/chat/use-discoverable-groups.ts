import { useState, useEffect, useCallback } from "react";
import { getDiscoverableGroups } from "@/services/chat";
import type { DiscoverableGroupDto } from "@/types/chat";

export const useDiscoverableGroups = () => {
  const [groups, setGroups] = useState<DiscoverableGroupDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getDiscoverableGroups()
      .then((res) => {
        if (cancelled) return;
        if (!res.success) {
          throw new Error(res.message || "Không thể tải danh sách nhóm");
        }
        setGroups(res.data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("Không thể tải danh sách nhóm"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { groups, isLoading, error, refetch };
};