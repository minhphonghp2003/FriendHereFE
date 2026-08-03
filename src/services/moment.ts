import { httpClient } from "@/lib/axios";
import type { ApiResponse, CursorPageResponse } from "@/types/api";
import type { MomentDto, GroupedReactionDto, CreateMomentRequest } from "@/types/moment";
import { toMomentVisibility, toMomentStatus } from "@/types/moment";
import type { ImageDto } from "@/types/chat";

const normalizeMomentDto = (moment: MomentDto): MomentDto => ({
  ...moment,
  visibility: toMomentVisibility(moment.visibility),
  status: toMomentStatus(moment.status),
});

export const getMomentThumbnail = (moment: MomentDto): ImageDto | null =>
  moment.images[0] ?? (moment.video
    ? { originalUrl: moment.video.originalUrl, thumbUrl: moment.video.thumbUrl }
    : null);

export async function getFeedMoments(prevId?: number | null, take = 10): Promise<
  CursorPageResponse<MomentDto>
> {
  const res = await httpClient.get("/Moment/feed", {
    params: { prevId: prevId ?? undefined, take },
  });
  res.data.data = res.data.data.map(normalizeMomentDto);
  return res.data;
}

export async function getUserMoments(userId: number, prevId?: number | null, take = 10): Promise<
  CursorPageResponse<MomentDto>
> {
  const res = await httpClient.get(`/Moment/user/${userId}`, {
    params: { prevId: prevId ?? undefined, take },
  });
  res.data.data = res.data.data.map(normalizeMomentDto);
  return res.data;
}

export async function createMoment(input: CreateMomentRequest): Promise<MomentDto> {
  const { data } = await httpClient.post<ApiResponse<MomentDto>>("/Moment", input);
  return normalizeMomentDto(data.data);
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

export async function getMomentReactions(id: number, prevId?: number | null, take = 10): Promise<
  CursorPageResponse<GroupedReactionDto>
> {
  const { data } = await httpClient.get(`/Moment/${id}/reactions`, {
    params: { prevId: prevId ?? undefined, take },
  });
  return data;
}

export async function getMomentById(id: number): Promise<ApiResponse<MomentDto>> {
  const res = await httpClient.get<ApiResponse<MomentDto>>(`/Moment/${id}`);
  if (res.data.data) {
    return { ...res.data, data: normalizeMomentDto(res.data.data) };
  }
  return res.data;
}

export async function hideMoment(id: number): Promise<void> {
  await httpClient.post(`/Moment/${id}/hide`);
}
