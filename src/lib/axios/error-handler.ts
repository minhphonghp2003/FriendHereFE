import type { AxiosError } from "axios";

export interface HandledError {
  message: string;
  status?: number;
  code?: string;
}

export const handleApiError = (error: AxiosError): HandledError => {
  if (error.response) {
    const data = error.response.data as { message?: string; code?: string };
    return {
      message: data?.message ?? "An error occurred",
      status: error.response.status,
      code: data?.code,
    };
  }
  if (error.request) {
    return { message: "No response from server", code: "NETWORK_ERROR" };
  }
  return { message: error.message, code: "UNKNOWN_ERROR" };
};
