import { useState } from "react";
import { createJoinRequest } from "@/services/chat";

export const useCreateJoinRequest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (conversationId: number): Promise<number | undefined> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await createJoinRequest(conversationId);
      if (!res.success) {
        throw new Error(res.message || "Không thể gửi yêu cầu tham gia");
      }
      return res.data?.id;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Không thể gửi yêu cầu tham gia"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};
