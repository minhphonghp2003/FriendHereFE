import { useAuth } from "@/providers/auth-provider";

export const useLogout = () => {
  const { logout: authLogout } = useAuth();

  const mutate = async () => {
    authLogout();
  };

  return { mutate, isLoading: false, error: null };
};
