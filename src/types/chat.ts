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
  momentId?: number | null;
  momentThumbnail: ImageDto | null;
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
  isBlocked: boolean;
  blockedById: number | null;
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
  momentId?: number | null;
}

export const MessageType = {
  Text: 0,
  File: 1,
  Emoji: 2,
  Sticker: 3,
  System: 4,
  Gif: 5,
} as const;

export type ChatMessageRenderType = "Text" | "File" | "Emoji" | "Sticker" | "System" | "Gif";

const CHAT_RENDER_TYPE_MAP: Record<string, ChatMessageRenderType> = {
  "0": "Text",
  "1": "File",
  "2": "Emoji",
  "3": "Sticker",
  "4": "System",
  "5": "Gif",
  Text: "Text",
  File: "File",
  Emoji: "Emoji",
  Sticker: "Sticker",
  System: "System",
  Gif: "Gif",
};

export const toChatMessageRenderType = (type?: string | null): ChatMessageRenderType =>
  CHAT_RENDER_TYPE_MAP[type ?? ""] ?? "Text";
