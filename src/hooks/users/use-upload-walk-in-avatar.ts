import { useState } from "react";
import { uploadWalkInAvatar } from "@/services/user";
import type { WalkInUser } from "@/types/user";

export const useUploadWalkInAvatar = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (id: number, file: File): Promise<WalkInUser> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await uploadWalkInAvatar(id, file);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to upload avatar"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};
