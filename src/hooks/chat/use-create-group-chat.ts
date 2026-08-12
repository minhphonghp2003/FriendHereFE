import { useState } from "react";
import { createGroupChat } from "@/services/chat";
import type { CreateGroupChatRequest } from "@/types/chat";

export const useCreateGroupChat = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (input: CreateGroupChatRequest): Promise<number> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await createGroupChat(input.name, input.memberIds, input.isRestricted);
      if (!res.success || !res.data) {
        throw new Error(res.message || "Không thể tạo nhóm chat");
      }
      return res.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Không thể tạo nhóm chat"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};
