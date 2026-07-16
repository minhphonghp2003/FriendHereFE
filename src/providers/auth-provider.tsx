"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCredentials, logout } from "@/store/slices/auth-slice";
import { getUserById } from "@/services/user";
import { TOKEN_KEY, USER_ID_KEY, USER_INFO_KEY } from "@/constants";

interface AuthContextValue {
  isAuthenticated: boolean;
  user: { id: number; name: string; email: string; isWalkIn: boolean } | null;
  token: string | null;
  login: (user: { id: number; name: string; email: string; isWalkIn: boolean }, token?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const dispatch = useAppDispatch();
  const { user, token, isAuthenticated } = useAppSelector((state) => state.auth);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem(USER_ID_KEY);
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (userId) {
      let name = "";
      let email = "";
      let isWalkIn = !storedToken;
      try {
        const storedInfo = localStorage.getItem(USER_INFO_KEY);
        if (storedInfo) {
          const info = JSON.parse(storedInfo);
          name = info.name ?? "";
          email = info.email ?? "";
          isWalkIn = info.isWalkIn ?? !storedToken;
        }
      } catch {}

      dispatch(setCredentials({
        user: { id: Number(userId), name, email, isWalkIn },
        token: storedToken || undefined,
      }));

      const fetchDetail = async () => {
        try {
          const detail = await getUserById(Number(userId));
          dispatch(setCredentials({
            user: { id: detail.id, name: detail.name, email: detail.email ?? "", isWalkIn },
            token: storedToken || undefined,
          }));
          localStorage.setItem(USER_INFO_KEY, JSON.stringify({
            name: detail.name,
            email: detail.email ?? "",
            isWalkIn,
          }));
        } catch {
          // keep cached data if fetch fails
        }
      };
      fetchDetail();
    }
    setHydrated(true);
  }, [dispatch]);

  const handleLogin = (userData: { id: number; name: string; email: string; isWalkIn: boolean }, authToken?: string) => {
    localStorage.setItem(USER_ID_KEY, String(userData.id));
    localStorage.setItem(USER_INFO_KEY, JSON.stringify({
      name: userData.name,
      email: userData.email,
      isWalkIn: userData.isWalkIn,
    }));
    if (authToken) {
      localStorage.setItem(TOKEN_KEY, authToken);
    }
    dispatch(setCredentials({ user: userData, token: authToken }));
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(USER_INFO_KEY);
    dispatch(logout());
  };

  if (!hydrated) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, login: handleLogin, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
