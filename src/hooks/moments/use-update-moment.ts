import { useState } from "react";
import { updateMoment } from "@/services/moment";
import type { MomentDto, UpdateMomentInput } from "@/types/moment";

export const useUpdateMoment = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (id: number, input: UpdateMomentInput): Promise<MomentDto> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await updateMoment(id, input);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update moment"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};
