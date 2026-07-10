import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { env } from "@/config/env";
import { TOKEN_KEY } from "@/constants";

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
    async (error) => {
      const originalRequest = error.config;
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        if (typeof window !== "undefined") {
          localStorage.removeItem(TOKEN_KEY);
          window.location.href = "/login";
        }
      }
      return Promise.reject(error);
    },
  );
};
