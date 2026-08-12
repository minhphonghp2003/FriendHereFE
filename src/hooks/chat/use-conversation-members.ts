import { useState, useEffect, useCallback } from "react";
import { getConversationMembers } from "@/services/chat";
import type { ConversationMemberDto } from "@/types/chat";

export const useConversationMembers = (conversationId: number) => {
  const [members, setMembers] = useState<ConversationMemberDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    getConversationMembers(conversationId)
      .then((res) => {
        if (cancelled) return;
        if (!res.success) {
          throw new Error(res.message || "Không thể tải danh sách thành viên");
        }
        setMembers(res.data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("Không thể tải danh sách thành viên"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, refreshKey]);

  return { members, isLoading, error, refetch };
};