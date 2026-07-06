"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCredentials, logout } from "@/store/slices/auth-slice";
import { TOKEN_KEY } from "@/constants";

interface AuthContextValue {
  isAuthenticated: boolean;
  user: { id: number; email: string; name: string } | null;
  login: (user: { id: number; email: string; name: string }, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && !isAuthenticated) {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [isAuthenticated]);

  const login = (userData: { id: number; email: string; name: string }, token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    dispatch(setCredentials({ user: userData, token }));
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    dispatch(logout());
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
