import { useState } from "react";
import { renameGroupChat } from "@/services/chat";

export const useRenameGroupChat = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (conversationId: number, name: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await renameGroupChat(conversationId, name);
      if (!res.success) {
        throw new Error(res.message || "Không thể đổi tên nhóm");
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Không thể đổi tên nhóm"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};
