import { httpClient } from "@/lib/axios";
import type { ConversationDto, ConversationMemberDto, DiscoverableGroupDto, JoinRequestDto, MessageDto, MessageReactionUserDto } from "@/types/chat";
import type { CursorPageResponse } from "@/types/api";

export async function getConversations(prevId?: number | null, take = 20): Promise<
  CursorPageResponse<ConversationDto>
> {
  const res = await httpClient.get("/chat", {
    params: { prevId: prevId ?? undefined, take },
  });
  return res.data;
}

export async function getOpponentConversation(opponentId: number): Promise<{
  data: number | null;
  success: boolean;
  message?: string;
}> {
  const res = await httpClient.get(`/chat/opponent/${opponentId}`);
  return res.data;
}

export async function getConversation(
  conversationId: number
): Promise<{
  data: ConversationDto;
  success: boolean;
  message?: string;
}> {
  const res = await httpClient.get(`/chat/${conversationId}`);
  return res.data;
}

export async function getConversationMembers(
  conversationId: number
): Promise<{
  success: boolean;
  data: ConversationMemberDto[];
  message?: string;
}> {
  const res = await httpClient.get(`/Chat/${conversationId}/members`);
  return res.data;
}

export async function addGroupMember(
  conversationId: number,
  userId: number
): Promise<{ data: null; success: boolean; message?: string }> {
  const res = await httpClient.post(`/Chat/${conversationId}/members`, { userId });
  return res.data;
}

export async function removeGroupMember(
  conversationId: number,
  userId: number
): Promise<{ data: null; success: boolean; message?: string }> {
  const res = await httpClient.delete(`/Chat/${conversationId}/members/${userId}`);
  return res.data;
}

export async function leaveGroup(
  conversationId: number
): Promise<{ data: null; success: boolean; message?: string }> {
  const res = await httpClient.post(`/Chat/${conversationId}/leave`);
  return res.data;
}

export async function createJoinRequest(
  conversationId: number
): Promise<{
  data: { id?: number } | null;
  success: boolean;
  message?: string;
}> {
  const res = await httpClient.post(`/Chat/${conversationId}/join-request`);
  return res.data;
}

export async function joinGroupDirect(
  conversationId: number
): Promise<{ data: null; success: boolean; message?: string }> {
  const res = await httpClient.post(`/Chat/${conversationId}/join`);
  return res.data;
}

export async function cancelJoinRequest(
  requestId: number
): Promise<{ data: null; success: boolean; message?: string }> {
  const res = await httpClient.delete(`/Chat/join-request/${requestId}`);
  return res.data;
}

export async function confirmJoinRequest(
  requestId: number,
  isApproved: boolean
): Promise<{ data: null; success: boolean; message?: string }> {
  const res = await httpClient.put(`/Chat/join-request/${requestId}`, { isApproved });
  return res.data;
}

export async function getPendingJoinRequests(
  conversationId: number
): Promise<{
  success: boolean;
  data: JoinRequestDto[];
  message?: string;
}> {
  const res = await httpClient.get(`/Chat/${conversationId}/join-requests`);
  return res.data;
}

export async function getDiscoverableGroups(): Promise<{
  success: boolean;
  data: DiscoverableGroupDto[];
  message?: string;
}> {
  const res = await httpClient.get(`/Chat/discoverable`);
  return res.data;
}

export async function getMessages(
  conversationId: number,
  prevId?: number | null,
  take = 20
): Promise<CursorPageResponse<MessageDto>> {
  const res = await httpClient.get(`/chat/${conversationId}/messages`, {
    params: { prevId: prevId ?? undefined, take },
  });
  return res.data;
}

export async function getMessageReactions(
  conversationId: number,
  messageId: number,
  prevId?: number | null,
  take = 10
): Promise<CursorPageResponse<MessageReactionUserDto>> {
  const res = await httpClient.get(`/chat/${conversationId}/messages/${messageId}/reactions`, {
    params: { prevId: prevId ?? undefined, take },
  });
  return res.data;
}

export async function searchMessages(
  conversationId: number,
  params: { messageId?: number; content?: string }
): Promise<{
  success: boolean;
  data: MessageDto[];
  message?: string;
}> {
  const res = await httpClient.get(`/chat/${conversationId}/messages/search`, {
    params: {
      messageId: params.messageId ?? undefined,
      content: params.content ?? undefined,
    },
  });
  return res.data;
}

export async function createConversation(
  receiverId: number,
  content: string | null,
  messageType: number,
  momentId?: number | null,
  fileIds?: string[]
): Promise<{
  data: number;
  success: boolean;
  message?: string;
}> {
  const res = await httpClient.post("/chat", { receiverId, content, messageType, momentId, fileIds });
  return res.data;
}

export async function createGroupChat(
  name: string | undefined,
  memberIds: number[],
  isRestricted?: boolean
): Promise<{
  data: number;
  success: boolean;
  message?: string;
}> {
  const res = await httpClient.post("/Chat/group", { name, memberIds, isRestricted });
  return res.data;
}

export async function blockChatUser(
  targetUserId: number
): Promise<{ data: null; success: boolean; message?: string }> {
  const res = await httpClient.post("/Chat/block-user", { targetUserId });
  return res.data;
}

export async function unblockChatUser(
  targetUserId: number
): Promise<{ data: null; success: boolean; message?: string }> {
  const res = await httpClient.post("/Chat/unblock-user", { targetUserId });
  return res.data;
}

export async function renameGroupChat(
  conversationId: number,
  name: string
): Promise<{ data: null; success: boolean; message?: string }> {
  const res = await httpClient.put(`/Chat/${conversationId}/group/name`, { name });
  return res.data;
}

export async function changeGroupImage(
  conversationId: number,
  fileId: string
): Promise<{ data: null; success: boolean; message?: string }> {
  const res = await httpClient.put(`/Chat/${conversationId}/group/image`, { fileId });
  return res.data;
}

export async function setGroupRestricted(
  conversationId: number,
  isRestricted: boolean
): Promise<{ data: null; success: boolean; message?: string }> {
  const res = await httpClient.put(`/Chat/${conversationId}/group/restricted`, { isRestricted });
  return res.data;
}

export async function setConversationMuted(
  conversationId: number,
  isMuted: boolean
): Promise<{ data: null; success: boolean; message?: string }> {
  const res = await httpClient.post(`/Chat/${conversationId}/mute`, { isMuted });
  return res.data;
}

export async function setConversationArchived(
  conversationId: number,
  isArchived: boolean
): Promise<{ data: null; success: boolean; message?: string }> {
  const res = await httpClient.post(`/Chat/${conversationId}/archive`, { isArchived });
  return res.data;
}

export async function deleteChat(
  conversationId: number
): Promise<{ data: null; success: boolean; message?: string }> {
  const res = await httpClient.delete(`/Chat/${conversationId}`);
  return res.data;
}
