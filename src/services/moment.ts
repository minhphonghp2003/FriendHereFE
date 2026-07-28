import { httpClient } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { MomentDto } from "@/types/moment";

export async function getFeedMoments(skip = 0, take = 10): Promise<{
  data: MomentDto[];
  success: boolean;
  message?: string;
  totalCount: number;
}> {
  const res = await httpClient.get("/Moment/feed", {
    params: { skip, take },
  });
  return res.data;
}

export async function getUserMoments(userId: number, skip = 0, take = 10): Promise<{
  data: MomentDto[];
  success: boolean;
  message?: string;
  totalCount: number;
}> {
  const res = await httpClient.get(`/Moment/user/${userId}`, {
    params: { skip, take },
  });
  return res.data;
}

export async function createMoment(formData: FormData): Promise<MomentDto> {
  const { data } = await httpClient.post<ApiResponse<MomentDto>>("/Moment", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export async function updateMoment(id: number, input: {
  caption?: string;
  visibility?: string | null;
  allowComment?: boolean;
  excludedUserIds?: number[] | null;
}): Promise<MomentDto> {
  const { data } = await httpClient.put<ApiResponse<MomentDto>>(`/Moment/${id}`, input);
  return data.data;
}

export async function deleteMoment(id: number): Promise<void> {
  await httpClient.delete(`/Moment/${id}`);
}
