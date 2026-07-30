import { httpClient } from "@/lib/axios";
import type { ConversationDto, MessageDto } from "@/types/chat";

export async function getConversations(skip = 0, take = 20): Promise<{
  data: ConversationDto[];
  success: boolean;
  message?: string;
  totalCount: number;
}> {
  const res = await httpClient.get("/chat", {
    params: { skip, take },
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
  skip = 0,
  take = 20
): Promise<{
  data: MessageDto[];
  success: boolean;
  message?: string;
  totalCount: number;
}> {
  const res = await httpClient.get(`/chat/${conversationId}/messages`, {
    params: { skip, take },
  });
  return res.data;
}

export async function createConversation(
  receiverId: number,
  content: string,
  messageType: number,
  momentId?: number | null
): Promise<{
  data: number;
  success: boolean;
  message?: string;
}> {
  const res = await httpClient.post("/chat", { receiverId, content, messageType, momentId });
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
