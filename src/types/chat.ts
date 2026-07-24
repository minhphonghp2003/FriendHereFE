export interface ImageDto {
  originalUrl: string;
  thumbUrl: string;
}

export interface MessageDto {
  id: number;
  senderId: number;
  content: string | null;
  replyToId: number | null;
  type: 0 | 1 | 2 | 3 | 4;
  attachments: ImageDto[] | null;
  createdAt: string;
}

export interface ConversationDto {
  id: number | null;
  name: string;
  isDirect: boolean;
  isMuted: boolean;
  memberCount: number | null;
  isOnline: boolean;
  unreadCount: number | null;
  lastReadAt: string | null;
  image: ImageDto | null;
  lastReadMessage: MessageDto | null;
  lastMessage: MessageDto | null;
}

export interface SendMessageRequest {
  conversationId: number | null;
  receiverId: number | null;
  content: string;
  messageType: 0 | 1 | 2 | 3 | 4;
  replyToId: number | null;
}
