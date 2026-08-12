import { useState } from "react";
import { leaveGroup } from "@/services/chat";

export const useLeaveGroup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (conversationId: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await leaveGroup(conversationId);
      if (!res.success) {
        throw new Error(res.message || "Không thể rời khỏi nhóm");
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Không thể rời khỏi nhóm"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};