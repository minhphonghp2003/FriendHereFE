export interface ImageDto {
  originalUrl: string;
  thumbUrl: string;
}

export interface MessageDto {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  senderAvatar: ImageDto | null;
  senderRole: string;
  content: string | null;
  replyToId: number | null;
  type: string;
  attachments: ImageDto[];
  createdAt: string;
  isDeleted: boolean;
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
  conversationId: number;
  content: string;
  messageType: number;
  replyToId: number | null;
  idempotencyKey: string;
}
