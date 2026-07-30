import { useState } from "react";
import { hideMoment } from "@/services/moment";

export const useHideMoment = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (id: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await hideMoment(id);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to hide moment"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};
