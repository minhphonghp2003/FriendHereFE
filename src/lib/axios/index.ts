import axios from "axios";
import { env } from "@/config/env";
import { API_TIMEOUT } from "@/constants";
import { offlineFirstAdapter } from "@/lib/offline";
import { setupRequestInterceptor, setupResponseInterceptor } from "./interceptors";

const httpClient = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
  adapter: offlineFirstAdapter,
});

setupRequestInterceptor(httpClient);
setupResponseInterceptor(httpClient);

export { httpClient };
export { handleApiError } from "./error-handler";
