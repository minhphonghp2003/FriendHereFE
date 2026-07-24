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
  data: ConversationDto | null;
  success: boolean;
  message?: string;
}> {
  const res = await httpClient.get(`/chat/opponent/${opponentId}`);
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
