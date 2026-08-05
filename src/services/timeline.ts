import { httpClient } from "@/lib/axios";
import type { ApiResponse, CursorPageResponse } from "@/types/api";
import type { CreateTimelineInput, TimelineDto } from "@/types/timeline";

export async function getTimelineById(id: number): Promise<ApiResponse<TimelineDto>> {
  const { data } = await httpClient.get<ApiResponse<TimelineDto>>(`/Timeline/${id}`);
  return data;
}

export async function getMyTimelines(
  prevId?: number | null,
  take = 10,
): Promise<CursorPageResponse<TimelineDto>> {
  const { data } = await httpClient.get<CursorPageResponse<TimelineDto>>("/Timeline/me", {
    params: { prevId: prevId ?? undefined, take },
  });
  return data;
}

export async function getUserTimelines(
  userId: number,
  prevId?: number | null,
  take = 10,
): Promise<CursorPageResponse<TimelineDto>> {
  const { data } = await httpClient.get<CursorPageResponse<TimelineDto>>(
    `/Timeline/user/${userId}`,
    {
      params: { prevId: prevId ?? undefined, take },
    },
  );
  return data;
}

export async function createTimeline(input: CreateTimelineInput): Promise<TimelineDto> {
  const { data } = await httpClient.post<ApiResponse<TimelineDto>>("/Timeline", input);
  return data.data;
}

export async function deleteTimeline(id: number): Promise<void> {
  await httpClient.delete(`/Timeline/${id}`);
}
