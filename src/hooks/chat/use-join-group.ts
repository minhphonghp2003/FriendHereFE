import { useState } from "react";
import { joinGroupDirect } from "@/services/chat";

export const useJoinGroup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (conversationId: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await joinGroupDirect(conversationId);
      if (!res.success) {
        throw new Error(res.message || "Không thể tham gia nhóm");
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Không thể tham gia nhóm"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};