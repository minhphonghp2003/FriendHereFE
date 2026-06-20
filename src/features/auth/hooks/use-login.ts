import { useMutation } from "@tanstack/react-query";
import { login } from "../api";
import { useAuth } from "@/providers/auth-provider";
import type { LoginInput } from "../types";

export const useLogin = () => {
  const { login: authLogin } = useAuth();

  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: (data) => {
      authLogin(data.user, data.tokens.accessToken);
    },
  });
};
