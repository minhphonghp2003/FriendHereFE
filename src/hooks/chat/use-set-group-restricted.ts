import { useState } from "react";
import { setGroupRestricted } from "@/services/chat";

export const useSetGroupRestricted = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (conversationId: number, isRestricted: boolean): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await setGroupRestricted(conversationId, isRestricted);
      if (!res.success) {
        throw new Error(res.message || "Không thể cập nhật cài đặt nhóm");
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Không thể cập nhật cài đặt nhóm"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};