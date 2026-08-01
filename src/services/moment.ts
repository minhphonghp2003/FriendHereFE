import { httpClient } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { MomentDto, GroupedReactionDto, CreateMomentRequest } from "@/types/moment";
import type { ImageDto } from "@/types/chat";

export interface MomentPreview {
  id: number;
  firstImage: ImageDto;
}

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

export async function createMoment(input: CreateMomentRequest): Promise<MomentDto> {
  const { data } = await httpClient.post<ApiResponse<MomentDto>>("/Moment", input);
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

export async function addMomentReaction(id: number, emoji: string): Promise<void> {
  await httpClient.post(`/Moment/${id}/reactions`, { emoji });
}

export async function getMomentReactions(id: number, skip = 0, take = 10): Promise<{
  data: GroupedReactionDto[];
  totalCount: number;
}> {
  const { data } = await httpClient.get(`/Moment/${id}/reactions`, {
    params: { skip, take },
  });
  return data;
}

export async function getMomentById(id: number): Promise<{
  success: boolean;
  data?: MomentPreview;
  message?: string;
}> {
  const res = await httpClient.get(`/Moment/${id}`);
  return res.data;
}

export async function hideMoment(id: number): Promise<void> {
  await httpClient.post(`/Moment/${id}/hide`);
}
