"use client";

import { useState } from "react";
import { updateWalkIn } from "@/services/user";
import type { WalkInUser } from "@/types/user";

export const useUpdateWalkIn = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (
    id: number,
    input: { name?: string; image?: string | null; age?: number; genderId?: number },
  ): Promise<WalkInUser> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await updateWalkIn(id, input);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update profile"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};
