import { useState } from "react";
import { createWalkIn } from "@/services/user";
import type { WalkInInput } from "@/types/user";

export const useCreateWalkIn = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (input: WalkInInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await createWalkIn(input);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to create walk-in"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};
