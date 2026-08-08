import { httpClient } from "@/lib/axios";
import type { ConversationDto, MessageDto } from "@/types/chat";
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
