import { useState } from "react";
import { register as apiRegister } from "@/services/auth";
import { useAuth } from "@/providers/auth-provider";
import type { RegisterInput } from "@/types/auth";

export const useRegister = () => {
  const { login: authLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (input: RegisterInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRegister(input);
      authLogin({ id: data.userId, name: data.name, email: data.email }, data.token);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Registration failed"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};
