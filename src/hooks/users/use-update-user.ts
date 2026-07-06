import { useState } from "react";
import { updateCurrentUser } from "@/services/user";
import type { UpdateUserInput } from "@/types/user";

export const useUpdateCurrentUser = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (input: UpdateUserInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await updateCurrentUser(input);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update user"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};
