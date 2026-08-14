import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { toast } from "sonner";
import { TOKEN_KEY, TOKEN_EXPIRES_AT_KEY, USER_ID_KEY, USER_INFO_KEY } from "@/constants";
import { handleApiError } from "./error-handler";

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
          const hadToken = !!localStorage.getItem(TOKEN_KEY);
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
          localStorage.removeItem(USER_ID_KEY);
          localStorage.removeItem(USER_INFO_KEY);
          if (hadToken) {
            window.location.replace("/init");
          }
        }
      }
      toast.error(handleApiError(error).message);
      return Promise.reject(error);
    },
  );
};
