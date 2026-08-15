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

export interface MessageReadNotificationDto {
  conversationId: number;
  messageIds: number[];
  readerUserId: number;
  readAt: string;
}

export interface ConversationUpdatedNotificationDto {
  conversationId: number;
  lastMessage: MessageDto;
  unreadCount: number;
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
  status?: number;
  isMine?: boolean;
}

export interface ConversationDto {
  id: number | null;
  name: string;
  isDirect: boolean;
  isRestricted: boolean;
  isMuted: boolean;
  isArchived?: boolean;
  memberCount: number | null;
  isOnline: boolean;
  unreadCount: number | null;
  isBlocked: boolean;
  blockedById: number | null;
  image: ImageDto | null;
  lastMessage: MessageDto | null;
}

export interface ConversationMemberDto {
  userId: number;
  userName: string;
  userImage: ImageDto | null;
  role: number;
  isOnline: boolean;
}

export const ConversationMemberRole = {
  Host: 0,
  Member: 1,
} as const;

export interface JoinRequestDto {
  id: number;
  conversationId: number;
  userId: number;
  userName: string;
  userImage: ImageDto | null;
  status: number;
  createdAt: string;
}

export const JoinRequestStatus = {
  Pending: 0,
  Approved: 1,
  Rejected: 2,
  Cancelled: 3,
} as const;

export interface JoinRequestProcessedData {
  conversationId: number;
  requestId: number;
  userId: number;
  hostUserId: number;
  result: number;
  conversationName: string | null;
}

export const JoinRequestResult = {
  Approved: 1,
  Rejected: 2,
} as const;

export interface DiscoverableGroupDto {
  id: number;
  name: string;
  image: ImageDto | null;
  memberCount: number;
  isRestricted: boolean;
  joinRequestStatus?: number | null;
  joinRequestId?: number | null;
}

export interface CreateGroupChatRequest {
  name?: string;
  memberIds: number[];
  isRestricted?: boolean;
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
    return hasVideo
      ? "[Video]"
      : `[Hình ảnh${msg.attachments.length > 1 ? ` (${msg.attachments.length})` : ""}]`;
  }
  return "";
};
