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
    console.error("[RefreshToken] No refresh token available");
    throw new Error("No refresh token available");
  }

  console.log("[RefreshToken] Attempting to refresh access token");
  console.log("[RefreshToken] Refresh token being sent:", refreshToken ? refreshToken.substring(0, 20) + "..." : "missing");

  // Raw axios call — must NOT go through the intercepted instance
  let response;
  try {
    response = await axios.post(
      `${env.NEXT_PUBLIC_API_URL}/Auth/refresh`,
      {
        token: refreshToken,
        deviceInfo: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      },
      { timeout: 15000 },
    );
  } catch (error) {
    console.error("[RefreshToken] Network error during refresh:", error);
    throw new Error("Refresh request failed");
  }

  console.log("[RefreshToken] Response status:", response.status);
  console.log("[RefreshToken] Full response structure:", JSON.stringify(response.data, null, 2));

  // Handle different response structures
  let payload = response.data?.data;
  
  console.log("[RefreshToken] Initial payload extraction:", payload ? "found" : "missing");
  
  // If response structure is different, try alternative paths
  if (!payload?.token && !payload?.accessToken) {
    console.log("[RefreshToken] Primary payload invalid, trying alternative paths...");
    if (response.data?.token || response.data?.accessToken) {
      payload = response.data;
      console.log("[RefreshToken] Using response.data as payload");
    } else if (response.data?.data?.data?.token || response.data?.data?.data?.accessToken) {
      payload = response.data.data.data;
      console.log("[RefreshToken] Using response.data.data.data as payload");
    } else {
      console.log("[RefreshToken] No valid payload found in any expected location");
    }
  }

  console.log("[RefreshToken] Final payload:", payload ? "valid" : "invalid");
  console.log("[RefreshToken] Payload contents:", payload ? Object.keys(payload) : "N/A");

  if (!payload?.token && !payload?.accessToken) {
    console.error("[RefreshToken] Invalid response structure:", response.data);
    throw new Error("Invalid refresh response");
  }

  const {
    token,
    accessToken,
    refreshToken: newRefreshToken,
    expiresAt,
    refreshTokenExpiresAt,
  } = payload;

  // Use accessToken if token is not available (API naming convention)
  const newAccessToken = token || accessToken;

  console.log("[RefreshToken] New access token received, storing...");
  console.log("[RefreshToken] New token:", newAccessToken ? newAccessToken.substring(0, 20) + "..." : "missing");
  console.log("[RefreshToken] New refresh token:", newRefreshToken ? newRefreshToken.substring(0, 20) + "..." : "none rotated");

  // Store tokens in a specific order to ensure they persist
  // Step 1: Store to localStorage (critical - must succeed)
  try {
    localStorage.setItem(TOKEN_KEY, newAccessToken);
    console.log("[RefreshToken] Access token stored to localStorage:", localStorage.getItem(TOKEN_KEY) ? "verified" : "failed");
    
    if (newRefreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
      console.log("[RefreshToken] Refresh token updated in localStorage:", localStorage.getItem(REFRESH_TOKEN_KEY) ? "verified" : "failed");
    } else {
      console.log("[RefreshToken] Refresh token not rotated");
    }
    
    if (expiresAt) localStorage.setItem(TOKEN_EXPIRES_AT_KEY, expiresAt);
    if (refreshTokenExpiresAt) {
      localStorage.setItem(REFRESH_TOKEN_EXPIRES_AT_KEY, refreshTokenExpiresAt);
    }
  } catch (localStorageError) {
    console.error("[RefreshToken] CRITICAL: Failed to store tokens to localStorage:", localStorageError);
    throw new Error("Failed to store tokens to localStorage");
  }

  // Step 2: Update Redux store (optional - don't fail if this doesn't work)
  if (typeof window !== "undefined") {
    try {
      const { store } = require("@/store");
      if (store && store.dispatch) {
        store.dispatch({
          type: "auth/updateTokens",
          payload: { 
            token: newAccessToken, 
            refreshToken: newRefreshToken, 
            expiresAt, 
            refreshTokenExpiresAt 
          },
        });
        console.log("[RefreshToken] Redux store updated");
      } else {
        console.log("[RefreshToken] Redux store not available, skipping update");
      }
    } catch (reduxError) {
      console.log("[RefreshToken] Redux update failed (non-critical):", reduxError);
    }
  }

  // Verify token was stored
  const storedToken = localStorage.getItem(TOKEN_KEY);
  console.log("[RefreshToken] Verification - Token in storage:", storedToken ? "present" : "missing");
  if (storedToken !== newAccessToken) {
    console.error("[RefreshToken] VERIFICATION FAILED - Stored token doesn't match new token!");
  }

  console.log("[RefreshToken] Successfully refreshed and stored tokens");
  return newAccessToken;
}

/** Get a valid token: single-flight — concurrent callers share one refresh. */
function getValidToken(): Promise<string> {
  console.log("[getValidToken] Called, existing promise:", !!refreshPromise);
  if (refreshPromise) {
    console.log("[getValidToken] Reusing existing refresh promise");
    return refreshPromise;
  }

  console.log("[getValidToken] Creating new refresh promise");
  refreshPromise = refreshAccessToken().finally(() => {
    console.log("[getValidToken] Refresh promise completed, clearing reference");
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
          console.log("[Interceptor] Adding auth header to:", config.url || (config.baseURL || "") + (config.url || ""));
        } else if (!token) {
          console.log("[Interceptor] No token available for:", config.url || (config.baseURL || "") + (config.url || ""));
        }
      }
      return config;
    },
    (error) => Promise.reject(error),
  );
};

export const setupResponseInterceptor = (instance: AxiosInstance): void => {
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      console.log("[Interceptor] Request successful:", {
        url: response.config.url,
        status: response.status,
        method: response.config.method,
      });
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as
        | (InternalAxiosRequestConfig & { _retry?: boolean; _offlineQueued?: boolean })
        | undefined;

      console.log("[Interceptor] Request error:", {
        url: originalRequest?.url,
        status: error.response?.status,
        code: error.code,
        message: error.message,
      });

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
        console.log("[Interceptor] 401 detected, attempting token refresh");
        
        originalRequest._retry = true;

        if (typeof window !== "undefined") {
          const currentToken = localStorage.getItem(TOKEN_KEY);
          const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
          console.log("[Interceptor] Current token:", currentToken ? "exists" : "missing");
          console.log("[Interceptor] Refresh token:", refreshToken ? "exists" : "missing");

          if (refreshToken) {
            try {
              console.log("[Interceptor] Calling getValidToken...");
              const newToken = await getValidToken();
              console.log("[Interceptor] Token refresh successful, new token:", newToken ? newToken.substring(0, 20) + "..." : "missing");
              
              // Verify token is now in storage
              const currentToken = localStorage.getItem(TOKEN_KEY);
              console.log("[Interceptor] Token now in storage:", currentToken ? currentToken.substring(0, 20) + "..." : "missing");
              
              if (originalRequest.headers && newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                console.log("[Interceptor] Updated request headers with new token");
              }
              console.log("[Interceptor] Replaying original request:", originalRequest.url);
              return instance(originalRequest);
            } catch (refreshError) {
              // Refresh failed - clear all tokens and redirect to login
              console.error("[Interceptor] Token refresh failed:", refreshError);
              clearAllTokens();
              window.location.replace("/init");
              return Promise.reject(refreshError);
            }
          } else {
            // No refresh token available - clear existing tokens and redirect
            console.log("[Interceptor] No refresh token available, clearing tokens and redirecting");
            clearAllTokens();
            const hadToken = !!currentToken;
            if (hadToken) {
              console.log("[Interceptor] Had access token but no refresh token - redirecting to login");
              window.location.replace("/init");
            }
          }
        }
      }

      // Handle non-401 errors
      if (error.response?.status !== 401) {
        const apiError = handleApiError(error);
        console.error("[Interceptor] API Error:", {
          status: error.response?.status,
          message: apiError.message,
          url: originalRequest?.url,
          method: originalRequest?.method,
        });
        toast.error(apiError.message);
      } else {
        console.error("[Interceptor] 401 Error handled, redirecting to login...");
      }
      
      return Promise.reject(error);
    },
  );
};
