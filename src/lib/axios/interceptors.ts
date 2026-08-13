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
        (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
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
