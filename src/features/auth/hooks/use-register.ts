import { useMutation } from "@tanstack/react-query";
import { register } from "../api";
import { useAuth } from "@/providers/auth-provider";
import type { RegisterInput } from "../types";

export const useRegister = () => {
  const { login: authLogin } = useAuth();

  return useMutation({
    mutationFn: (input: RegisterInput) => register(input),
    onSuccess: (data) => {
      authLogin(data.user, data.tokens.accessToken);
    },
  });
};
