import { httpClient } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { FriendshipDto } from "@/types/friendship";

export async function getFriendshipById(id: number): Promise<FriendshipDto | null> {
  const { data } = await httpClient.get<ApiResponse<FriendshipDto>>(`/Friendship/${id}`);
  return data.data ?? null;
}

export async function getFriendshipsByUserId(userId: number): Promise<FriendshipDto[]> {
  const { data } = await httpClient.get<ApiResponse<FriendshipDto[]>>(`/Friendship/user/${userId}`);
  return data.data ?? [];
}

export async function sendFriendRequest(targetUserId: number): Promise<FriendshipDto> {
  const { data } = await httpClient.post<ApiResponse<FriendshipDto>>("/Friendship", { targetUserId });
  return data.data;
}

export async function acceptFriendRequest(id: number): Promise<FriendshipDto> {
  const { data } = await httpClient.put<ApiResponse<FriendshipDto>>(`/Friendship/${id}/accept`);
  return data.data;
}

export async function rejectFriendRequest(id: number): Promise<FriendshipDto> {
  const { data } = await httpClient.put<ApiResponse<FriendshipDto>>(`/Friendship/${id}/reject`);
  return data.data;
}

export async function revokeFriendRequest(id: number): Promise<FriendshipDto> {
  const { data } = await httpClient.put<ApiResponse<FriendshipDto>>(`/Friendship/${id}/revoke`);
  return data.data;
}

export async function blockUser(id: number): Promise<FriendshipDto> {
  const { data } = await httpClient.put<ApiResponse<FriendshipDto>>(`/Friendship/${id}/block`);
  return data.data;
}

export async function removeFriendship(id: number): Promise<void> {
  await httpClient.delete(`/Friendship/${id}`);
}
