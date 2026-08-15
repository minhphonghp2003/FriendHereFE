import { useState } from "react";
import { confirmJoinRequest } from "@/services/chat";

export const useConfirmJoinRequest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (requestId: number, isApproved: boolean): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await confirmJoinRequest(requestId, isApproved);
      if (!res.success) {
        throw new Error(res.message || "Không thể xử lý yêu cầu tham gia");
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Không thể xử lý yêu cầu tham gia"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};
