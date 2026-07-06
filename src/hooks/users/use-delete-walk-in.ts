import { useState } from "react";
import { deleteWalkIn } from "@/services/user";

export const useDeleteWalkIn = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      await deleteWalkIn(id);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to delete walk-in"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};
