import { httpClient } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export const deleteWalkIn = async (id: number): Promise<void> => {
  await httpClient.delete<ApiResponse<null>>(`/WalkIn/${id}`);
};
