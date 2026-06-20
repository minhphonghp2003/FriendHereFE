import { useMutation } from "@tanstack/react-query";
import { logout as apiLogout } from "../api";
import { useAuth } from "@/providers/auth-provider";

export const useLogout = () => {
  const { logout: authLogout } = useAuth();

  return useMutation({
    mutationFn: () => apiLogout(),
    onSettled: () => {
      authLogout();
    },
  });
};
