import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import axios from "axios";
import { toast } from "sonner";
import {
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  TOKEN_EXPIRES_AT_KEY,
  REFRESH_TOKEN_EXPIRES_AT_KEY,
  USER_ID_KEY,
  USER_INFO_KEY,
} from "@/constants";
import { env } from "@/config/env";
import { handleApiError } from "./error-handler";

/** Single-flight refresh: while a refresh is in flight, 401'd requests wait
 *  here and are replayed with the new token once it resolves. */
let refreshPromise: Promise<string> | null = null;

function clearAllTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
  localStorage.removeItem(REFRESH_TOKEN_EXPIRES_AT_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_INFO_KEY);

  // Clear Redux store
  if (typeof window !== "undefined") {
    const { store } = require("@/store");
    store.dispatch({ type: "auth/logout" });
  }
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  // Raw axios call — must NOT go through the intercepted instance
  const response = await axios.post(
    `${env.NEXT_PUBLIC_API_URL}/Auth/refresh`,
    {
      token: refreshToken,
      deviceInfo: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    },
    { timeout: 15000 },
  );

  const payload = response.data?.data;
  if (!payload?.token) {
    throw new Error("Invalid refresh response");
  }

  const {
    token,
    refreshToken: newRefreshToken,
    expiresAt,
    refreshTokenExpiresAt,
  } = payload;

  // Store new tokens (refresh token rotates — persist it when present)
  localStorage.setItem(TOKEN_KEY, token);
  if (newRefreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
  if (expiresAt) localStorage.setItem(TOKEN_EXPIRES_AT_KEY, expiresAt);
  if (refreshTokenExpiresAt) {
    localStorage.setItem(REFRESH_TOKEN_EXPIRES_AT_KEY, refreshTokenExpiresAt);
  }

  // Update Redux store
  if (typeof window !== "undefined") {
    const { store } = require("@/store");
    store.dispatch({
      type: "auth/updateTokens",
      payload: { token, refreshToken: newRefreshToken, expiresAt, refreshTokenExpiresAt },
    });
  }

  return token;
}

/** Get a valid token: single-flight — concurrent callers share one refresh. */
function getValidToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = refreshAccessToken().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export const setupRequestInterceptor = (instance: AxiosInstance): void => {
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => Promise.reject(error),
  );
};

export const setupResponseInterceptor = (instance: AxiosInstance): void => {
  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as
        | (InternalAxiosRequestConfig & { _retry?: boolean; _offlineQueued?: boolean })
        | undefined;

      // A mutation that was queued while offline — inform the user without
      // showing a scary error toast; the request will sync automatically.
      if (originalRequest?._offlineQueued || error.code === "ERR_OFFLINE_QUEUED") {
        toast.info("You're offline — action queued and will sync automatically.");
        return Promise.reject(error);
      }

      // Network failure while offline (e.g. no cached GET available).
      // The offline banner already communicates the state, so skip the toast.
      if (error.code === "ERR_NETWORK" && typeof navigator !== "undefined" && !navigator.onLine) {
        return Promise.reject(error);
      }

      // 401 → refresh once → replay the original request.
      // Refresh failure → clear tokens + logout.
      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;

        if (typeof window !== "undefined") {
          const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

          if (refreshToken) {
            try {
              const newToken = await getValidToken();
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
              return instance(originalRequest);
            } catch (refreshError) {
              // Refresh failed - clear all tokens and redirect to login
              console.error("Token refresh failed:", refreshError);
              clearAllTokens();
              window.location.replace("/init");
              return Promise.reject(refreshError);
            }
          } else {
            // No refresh token available - clear existing tokens and redirect
            clearAllTokens();
            const hadToken = !!localStorage.getItem(TOKEN_KEY);
            if (hadToken) {
              window.location.replace("/init");
            }
          }
        }
      }

      if (error.response?.status !== 401) {
        toast.error(handleApiError(error).message);
      }
      return Promise.reject(error);
    },
  );
};
