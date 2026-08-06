import { httpClient } from "@/lib/axios";
import type { CursorPageResponse } from "@/types/api";
import type { ActiveUserDto } from "@/lib/signalr/types";

export const LOCATION_SORT = {
  Distance: "Distance",
} as const;

export type LocationSort = (typeof LOCATION_SORT)[keyof typeof LOCATION_SORT];

export async function getActiveUsers(params?: {
  prevId?: number | null;
  take?: number;
  sortBy?: LocationSort;
}): Promise<CursorPageResponse<ActiveUserDto>> {
  const { data } = await httpClient.get("/Location/active", {
    params: {
      prevId: params?.prevId ?? undefined,
      take: params?.take,
      sortBy: params?.sortBy,
    },
  });
  return data;
}
