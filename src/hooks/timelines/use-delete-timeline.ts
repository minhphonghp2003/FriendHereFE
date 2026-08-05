import { useState } from "react";
import { deleteTimeline } from "@/services/timeline";

export const useDeleteTimeline = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (id: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await deleteTimeline(id);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to delete timeline"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};
