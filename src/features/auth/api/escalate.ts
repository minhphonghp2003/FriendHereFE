import { httpClient } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { AuthResponse, EscalateInput } from "../types";

export const escalate = async (userId: number, input: EscalateInput): Promise<AuthResponse> => {
  const { data } = await httpClient.post<ApiResponse<AuthResponse>>(`/Auth/escalate/${userId}`, input);
  return data.data;
};
