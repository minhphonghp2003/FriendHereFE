import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  refreshTokenExpiresAt: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  expiresAt: null,
  refreshTokenExpiresAt: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        user: User;
        token?: string;
        refreshToken?: string;
        expiresAt?: string;
        refreshTokenExpiresAt?: string;
      }>,
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token ?? null;
      state.refreshToken = action.payload.refreshToken ?? null;
      state.expiresAt = action.payload.expiresAt ?? null;
      state.refreshTokenExpiresAt = action.payload.refreshTokenExpiresAt ?? null;
      state.isAuthenticated = true;
    },
    updateTokens: (
      state,
      action: PayloadAction<{
        token: string;
        refreshToken: string;
        expiresAt: string;
        refreshTokenExpiresAt: string;
      }>,
    ) => {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.expiresAt = action.payload.expiresAt;
      state.refreshTokenExpiresAt = action.payload.refreshTokenExpiresAt;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.expiresAt = null;
      state.refreshTokenExpiresAt = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, logout, updateTokens } = authSlice.actions;
export const authReducer = authSlice.reducer;
