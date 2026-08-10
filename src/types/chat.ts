export interface ImageDto {
  originalUrl: string;
  thumbUrl: string;
}

export type FileDto = ImageDto;

export interface RepliedMessageDto {
  messageId: number;
  content: string | null;
  senderName: string | null;
  senderAvatar: FileDto | null;
  type: number;
  attachments: FileDto[] | null;
  momentThumbnail: FileDto | null;
  isDeleted: boolean;
}

export interface MessageReactionDto {
  userId: number;
  emoji: string;
}

export interface MessageReactionNotificationDto {
  conversationId: number;
  messageId: number;
  userId: number;
  userName: string;
  userImage: ImageDto | null;
  emoji: string;
}

export interface MessageReactionRemovedNotificationDto {
  conversationId: number;
  messageId: number;
  userId: number;
  emoji: string;
}

export interface MessageReactionUserDto {
  userId: number;
  userName: string;
  userImage: ImageDto | null;
  emojis: string[];
}

export interface AddMessageReactionRequest {
  conversationId: number;
  messageId: number;
  emoji: string;
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
  repliedMessage: RepliedMessageDto | null;
  type: string;
  attachments: ImageDto[];
  createdAt: string;
  isDeleted: boolean;
  momentId?: number | null;
  momentThumbnail: ImageDto | null;
  reactions?: MessageReactionDto[] | null;
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

export interface CreateGroupChatRequest {
  name?: string;
  memberIds: number[];
}

export interface SendMessageRequest {
  conversationId: number;
  content: string | null;
  messageType: number;
  replyToId: number | null;
  idempotencyKey: string;
  momentId?: number | null;
  fileIds?: string[];
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

const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|avi)$/i;

export const isVideoUrl = (url?: string | null): boolean =>
  !!url && VIDEO_EXT_RE.test(url.split("?")[0]);

export const getMessagePreview = (msg: MessageDto | null): string => {
  if (!msg) return "";

  const type = toChatMessageRenderType(msg.type);

  if (type === "Gif") return "[GIF]";
  if (type === "Sticker") return "[Sticker]";
  if (type === "File") return "[File]";
  if (type === "Emoji") return msg.content || "[Emoji]";
  if (type === "System") return msg.content || "[Hệ thống]";
  if (msg.content) return msg.content;

  if (msg.attachments && msg.attachments.length > 0) {
    const hasVideo = msg.attachments.some((a) => isVideoUrl(a.originalUrl));
    return hasVideo ? "[Video]" : `[Hình ảnh${msg.attachments.length > 1 ? ` (${msg.attachments.length})` : ""}]`;
  }
  return "";
};
