import { useState } from "react";
import { addGroupMember } from "@/services/chat";

export const useAddGroupMember = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (conversationId: number, userId: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await addGroupMember(conversationId, userId);
      if (!res.success) {
        throw new Error(res.message || "Không thể thêm thành viên");
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Không thể thêm thành viên"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};
