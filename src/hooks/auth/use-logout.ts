import { useState } from "react";
import { logout as apiLogout } from "@/services/auth";
import { useAuth } from "@/providers/auth-provider";

export const useLogout = () => {
  const { logout: authLogout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await apiLogout();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Logout failed"));
    } finally {
      authLogout();
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};
