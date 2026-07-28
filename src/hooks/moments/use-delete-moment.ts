import { useState } from "react";
import { deleteMoment } from "@/services/moment";

export const useDeleteMoment = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (id: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await deleteMoment(id);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to delete moment"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};
