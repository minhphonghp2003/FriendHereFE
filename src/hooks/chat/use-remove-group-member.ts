import { useState } from "react";
import { removeGroupMember } from "@/services/chat";

export const useRemoveGroupMember = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (conversationId: number, userId: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await removeGroupMember(conversationId, userId);
      if (!res.success) {
        throw new Error(res.message || "Không thể xóa thành viên");
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Không thể xóa thành viên"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};