import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { toast } from "sonner";
import {
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  TOKEN_EXPIRES_AT_KEY,
  REFRESH_TOKEN_EXPIRES_AT_KEY,
  USER_ID_KEY,
  USER_INFO_KEY,
} from "@/constants";
import { handleApiError } from "./error-handler";

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
  isRefreshing = false;
}

function shouldRefreshToken(): boolean {
  const expiresAt = localStorage.getItem(TOKEN_EXPIRES_AT_KEY);
  if (!expiresAt) return false;

  const expiryTime = new Date(expiresAt).getTime();
  const now = Date.now();
  const refreshThreshold = 5 * 60 * 1000; // 5 minutes before expiry

  return expiryTime - now < refreshThreshold;
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const axios = require("axios");
  const { env } = require("@/config/env");

  const response = await axios.post(`${env.NEXT_PUBLIC_API_URL}/Auth/refresh`, {
    token: refreshToken,
    deviceInfo: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    ipAddress: undefined, // Can be added if needed
  });

  if (response.data && response.data.data) {
    const {
      token,
      refreshToken: newRefreshToken,
      expiresAt,
      refreshTokenExpiresAt,
    } = response.data.data;

    // Store new tokens
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
    localStorage.setItem(TOKEN_EXPIRES_AT_KEY, expiresAt);
    localStorage.setItem(REFRESH_TOKEN_EXPIRES_AT_KEY, refreshTokenExpiresAt);

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

  throw new Error("Invalid refresh response");
}

export const setupRequestInterceptor = (instance: AxiosInstance): void => {
  instance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      if (typeof window !== "undefined") {
        // Check if token needs refresh before making request
        if (shouldRefreshToken() && !isRefreshing) {
          try {
            const newToken = await refreshAccessToken();
            if (config.headers) {
              config.headers.Authorization = `Bearer ${newToken}`;
            }
          } catch (error) {
            // Refresh failed, continue with current token
            console.error("Token refresh failed:", error);
          }
        }

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
        (InternalAxiosRequestConfig & { _retry?: boolean; _offlineQueued?: boolean }) | undefined;

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

      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;

        if (typeof window !== "undefined") {
          const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

          if (refreshToken) {
            if (isRefreshing) {
              return new Promise((resolve) => {
                subscribeTokenRefresh((token: string) => {
                  if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                  }
                  resolve(instance(originalRequest));
                });
              });
            }

            isRefreshing = true;

            try {
              const newToken = await refreshAccessToken();
              onTokenRefreshed(newToken);

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
