"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCredentials, logout } from "@/store/slices/auth-slice";
import { TOKEN_KEY, USER_ID_KEY } from "@/constants";

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
      dispatch(setCredentials({
        user: { id: Number(userId), name: "", email: "", isWalkIn: !storedToken },
        token: storedToken || undefined,
      }));
    }
    setHydrated(true);
  }, [dispatch]);

  const handleLogin = (userData: { id: number; name: string; email: string; isWalkIn: boolean }, authToken?: string) => {
    localStorage.setItem(USER_ID_KEY, String(userData.id));
    if (authToken) {
      localStorage.setItem(TOKEN_KEY, authToken);
    }
    dispatch(setCredentials({ user: userData, token: authToken }));
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
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
