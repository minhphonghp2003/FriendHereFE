import { httpClient } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { WalkInUser, WalkInInput } from "../types";

export const createWalkIn = async (input: WalkInInput): Promise<WalkInUser> => {
  const { data } = await httpClient.post<ApiResponse<WalkInUser>>("/WalkIn", input);
  return data.data;
};
