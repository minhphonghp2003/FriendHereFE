import { useState } from "react";
import { changeMomentVisibility } from "@/services/moment";
import type { MomentDto, MomentVisibility } from "@/types/moment";

export const useChangeMomentVisibility = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (id: number, visibility: MomentVisibility): Promise<MomentDto> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await changeMomentVisibility(id, visibility);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to change moment visibility"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};
