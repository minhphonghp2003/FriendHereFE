import { useState } from "react";
import { cancelJoinRequest } from "@/services/chat";

export const useCancelJoinRequest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (requestId: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await cancelJoinRequest(requestId);
      if (!res.success) {
        throw new Error(res.message || "Không thể hủy yêu cầu tham gia");
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Không thể hủy yêu cầu tham gia"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};