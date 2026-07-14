import { useState } from "react";
import { uploadAvatar } from "@/services/user";
import type { User } from "@/types/user";

export const useUploadAvatar = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (file: File): Promise<User> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await uploadAvatar(file);
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
