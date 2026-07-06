import { useState } from "react";
import { login as apiLogin } from "@/services/auth";
import { useAuth } from "@/providers/auth-provider";
import type { LoginInput } from "@/types/auth";

export const useLogin = () => {
  const { login: authLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (input: LoginInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiLogin(input);
      authLogin({ id: data.userId, name: data.name, email: data.email }, data.token);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Login failed"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};
