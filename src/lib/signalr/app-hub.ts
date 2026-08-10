import * as signalR from "@microsoft/signalr";
import { env } from "@/config/env";
import { TOKEN_KEY } from "@/constants";
import type { MessageDto, ConversationDto, SendMessageRequest, AddMessageReactionRequest, MessageReactionNotificationDto, MessageReactionRemovedNotificationDto, MessageReadNotificationDto } from "@/types/chat";
import type { FriendshipDto } from "@/types/friendship";
import type { MomentReactionNotification } from "@/types/moment";
import type { IncomingCallData, CallSignalDto, CallSignalData } from "@/types/call";

export type KickedCallback = () => void;
export type ReceiveMessageCallback = (message: MessageDto) => void;
export type ReceiveNewConversationCallback = (conversation: ConversationDto, initialMessage: MessageDto) => void;
export type ReceiveFriendshipCreatedCallback = (dto: FriendshipDto) => void;
export type ReceiveFriendshipAcceptedCallback = (dto: FriendshipDto) => void;
export type ReceiveFriendshipBlockedCallback = (dto: FriendshipDto) => void;
export type ReceiveFriendshipUnblockedCallback = (dto: FriendshipDto) => void;

export interface EditMessageRequest {
  conversationId: number;
  messageId: number;
  content: string;
}

export interface DeleteMessageRequest {
  conversationId: number;
  messageId: number;
}

export type ReceiveMessageEditedCallback = (message: MessageDto) => void;
export type ReceiveMessageDeletedCallback = (messageId: number) => void;
export type ReceiveMessageReactedCallback = (data: MessageReactionNotificationDto) => void;
export type ReceiveMessageReactedRemovedCallback = (data: MessageReactionRemovedNotificationDto) => void;
export type ReceiveMessagesReadCallback = (data: MessageReadNotificationDto) => void;

export interface TypingData {
  conversationId: number;
  userId: number;
  userName: string;
  isTyping: boolean;
}

export type ReceiveTypingCallback = (data: TypingData) => void;
export type ReceiveCallCallback = (data: IncomingCallData) => void;
export type ReceiveCallSignalCallback = (data: CallSignalData) => void;

export interface ChatBlockedData {
  targetUserId: number;
}

export type ReceiveChatBlockedCallback = (data: ChatBlockedData) => void;
export type ReceiveChatUnblockedCallback = (data: ChatBlockedData) => void;
export type ReceiveMomentReactedCallback = (data: MomentReactionNotification) => void;

export interface FileMarkedSuccessData {
  originalKey: string;
  thumbKey: string;
  originalUrl: string;
  thumbUrl: string;
  fileId?: string;
  key?: string;
}

export type ReceiveFileMarkedSuccessCallback = (data: FileMarkedSuccessData) => void;

class AppHub {
  private connection: signalR.HubConnection | null = null;
  private epoch = 0;
  private connectionReady: Promise<void> | null = null;
  private kickedCallback: KickedCallback | null = null;
  private receiveMessageCallbacks: Set<ReceiveMessageCallback> = new Set();
  private receiveMessageEditedCallbacks: Set<ReceiveMessageEditedCallback> = new Set();
  private receiveMessageDeletedCallbacks: Set<ReceiveMessageDeletedCallback> = new Set();
  private receiveMessageReactedCallbacks: Set<ReceiveMessageReactedCallback> = new Set();
  private receiveMessageReactedRemovedCallbacks: Set<ReceiveMessageReactedRemovedCallback> = new Set();
  private receiveMessagesReadCallbacks: Set<ReceiveMessagesReadCallback> = new Set();
  private receiveNewConversationCallback: ReceiveNewConversationCallback | null = null;
  private receiveFriendshipCreatedCallbacks: Set<ReceiveFriendshipCreatedCallback> = new Set();
  private receiveFriendshipAcceptedCallbacks: Set<ReceiveFriendshipAcceptedCallback> = new Set();
  private receiveFriendshipBlockedCallbacks: Set<ReceiveFriendshipBlockedCallback> = new Set();
  private receiveFriendshipUnblockedCallbacks: Set<ReceiveFriendshipUnblockedCallback> = new Set();
  private receiveChatBlockedCallbacks: Set<ReceiveChatBlockedCallback> = new Set();
  private receiveChatUnblockedCallbacks: Set<ReceiveChatUnblockedCallback> = new Set();
  private receiveTypingCallbacks: Set<ReceiveTypingCallback> = new Set();
  private receiveCallCallbacks: Set<ReceiveCallCallback> = new Set();
  private receiveCallSignalCallbacks: Set<ReceiveCallSignalCallback> = new Set();
  private receiveMomentReactedCallbacks: Set<ReceiveMomentReactedCallback> = new Set();
  private receiveFileMarkedSuccessCallbacks: Set<ReceiveFileMarkedSuccessCallback> = new Set();
  private joinedConversations: Set<number> = new Set();

  async start(): Promise<void> {
    const myEpoch = ++this.epoch;

    if (this.connection) {
      const state = this.connection.state;
      if (state === signalR.HubConnectionState.Connected) {
        return;
      }
      const oldConnection = this.connection;
      this.connection = null;
      try {
        await oldConnection.stop();
      } catch {
      }
    }

    if (myEpoch !== this.epoch) return;

    const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      console.warn("[AppHub] No token available, skipping connection");
      return;
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(env.NEXT_PUBLIC_SIGNALR_APP_URL, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    this.connection.on("ReceiveKicked", () => {
      console.log("[AppHub] Kicked by another connection");
      this.kickedCallback?.();
    });

    this.connection.on("ReceiveMessage", (message: MessageDto) => {
      this.receiveMessageCallbacks.forEach((cb) => cb(message));
    });

    this.connection.on("ReceiveMessageEdited", (message: MessageDto) => {
      this.receiveMessageEditedCallbacks.forEach((cb) => cb(message));
    });

    this.connection.on("ReceiveMessageDeleted", (messageId: number) => {
      this.receiveMessageDeletedCallbacks.forEach((cb) => cb(messageId));
    });

    this.connection.on("ReceiveMessageReacted", (data: MessageReactionNotificationDto) => {
      this.receiveMessageReactedCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on("ReceiveMessageReactedRemoved", (data: MessageReactionRemovedNotificationDto) => {
      this.receiveMessageReactedRemovedCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on("ReceiveMessagesRead", (data: MessageReadNotificationDto) => {
      this.receiveMessagesReadCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on("ReceiveNewConversation", (conversation: ConversationDto, initialMessage: MessageDto) => {
      this.receiveNewConversationCallback?.(conversation, initialMessage);
    });

    this.connection.on("ReceiveFriendshipCreated", (dto: FriendshipDto) => {
      this.receiveFriendshipCreatedCallbacks.forEach((cb) => cb(dto));
    });

    this.connection.on("ReceiveFriendshipAccepted", (dto: FriendshipDto) => {
      this.receiveFriendshipAcceptedCallbacks.forEach((cb) => cb(dto));
    });

    this.connection.on("ReceiveFriendshipBlocked", (dto: FriendshipDto) => {
      this.receiveFriendshipBlockedCallbacks.forEach((cb) => cb(dto));
    });

    this.connection.on("ReceiveFriendshipUnblocked", (dto: FriendshipDto) => {
      this.receiveFriendshipUnblockedCallbacks.forEach((cb) => cb(dto));
    });

    this.connection.on("ReceiveChatBlocked", (data: ChatBlockedData) => {
      this.receiveChatBlockedCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on("ReceiveChatUnblocked", (data: ChatBlockedData) => {
      this.receiveChatUnblockedCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on("ReceiveTyping", (data: TypingData) => {
      this.receiveTypingCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on("ReceiveCall", (data: IncomingCallData) => {
      this.receiveCallCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on("ReceiveCallSignal", (data: CallSignalData) => {
      this.receiveCallSignalCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on("ReceiveMomentReacted", (data: MomentReactionNotification) => {
      this.receiveMomentReactedCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on("ReceiveFileMarkedSuccess", (data: FileMarkedSuccessData) => {
      this.receiveFileMarkedSuccessCallbacks.forEach((cb) => cb(data));
    });

    this.connection.onclose(() => {
      console.log("[AppHub] Disconnected");
    });

    this.connection.onreconnecting(() => {
      console.log("[AppHub] Reconnecting...");
    });

    this.connection.onreconnected(async () => {
      console.log("[AppHub] Reconnected");
      for (const convId of this.joinedConversations) {
        try {
          await this.connection?.invoke("JoinConversation", convId);
        } catch { }
      }
    });

    try {
      this.connectionReady = this.connection.start().then(() => {
        console.log("[AppHub] Connected");
      });
      await this.connectionReady;
    } catch (err) {
      this.connectionReady = null;
      if (myEpoch === this.epoch) {
        this.connection = null;
        throw err;
      }
    }
  }

  async stop(): Promise<void> {
    ++this.epoch;
    this.connectionReady = null;
    this.joinedConversations.clear();
    this.receiveFriendshipCreatedCallbacks.clear();
    this.receiveFriendshipAcceptedCallbacks.clear();
    this.receiveFriendshipBlockedCallbacks.clear();
    this.receiveFriendshipUnblockedCallbacks.clear();
    this.receiveChatBlockedCallbacks.clear();
    this.receiveChatUnblockedCallbacks.clear();
    this.receiveMessageCallbacks.clear();
    this.receiveMessageEditedCallbacks.clear();
    this.receiveMessageDeletedCallbacks.clear();
    this.receiveMessageReactedCallbacks.clear();
    this.receiveMessageReactedRemovedCallbacks.clear();
    this.receiveMessagesReadCallbacks.clear();
    this.receiveTypingCallbacks.clear();
    this.receiveCallCallbacks.clear();
    this.receiveCallSignalCallbacks.clear();
    this.receiveMomentReactedCallbacks.clear();
    this.receiveFileMarkedSuccessCallbacks.clear();
    const conn = this.connection;
    if (conn) {
      this.connection = null;
      try {
        await conn.stop();
      } catch {
      }
    }
  }

  async sendMessage(dto: SendMessageRequest): Promise<void> {
    if (!this.connection) throw new Error("AppHub not connected");
    await this.connection.invoke("SendMessage", dto);
  }

  async editMessage(dto: EditMessageRequest): Promise<void> {
    if (!this.connection) throw new Error("AppHub not connected");
    await this.connection.invoke("EditMessage", dto);
  }

  async deleteMessage(dto: DeleteMessageRequest): Promise<void> {
    if (!this.connection) throw new Error("AppHub not connected");
    await this.connection.invoke("DeleteMessage", dto);
  }

  async reactMessage(dto: AddMessageReactionRequest): Promise<void> {
    if (!this.connection) throw new Error("AppHub not connected");
    await this.connection.invoke("ReactMessage", dto);
  }

  async removeReactMessage(dto: AddMessageReactionRequest): Promise<void> {
    if (!this.connection) throw new Error("AppHub not connected");
    await this.connection.invoke("RemoveReactMessage", dto);
  }

  async sendTyping(conversationId: number, isTyping: boolean): Promise<void> {
    if (!this.connection) throw new Error("AppHub not connected");
    await this.connection.invoke("Typing", conversationId, isTyping);
  }

  async call(targetUserId: number): Promise<void> {
    if (!this.connection) throw new Error("AppHub not connected");
    await this.connection.invoke("Call", { targetUserId });
  }

  async sendCallSignal(dto: CallSignalDto): Promise<void> {
    if (!this.connection) throw new Error("AppHub not connected");
    await this.connection.invoke("CallSignal", dto);
  }

  async joinConversation(id: number): Promise<void> {
    if (this.connectionReady) await this.connectionReady;
    if (!this.connection) throw new Error("AppHub not connected");
    await this.connection.invoke("JoinConversation", id);
    this.joinedConversations.add(id);
  }

  async leaveConversation(id: number): Promise<void> {
    if (!this.connection) throw new Error("AppHub not connected");
    await this.connection.invoke("LeaveConversation", id);
    this.joinedConversations.delete(id);
  }

  onKicked(callback: KickedCallback): void {
    this.kickedCallback = callback;
  }

  onReceiveMessage(callback: ReceiveMessageCallback): () => void {
    this.receiveMessageCallbacks.add(callback);
    return () => { this.receiveMessageCallbacks.delete(callback); };
  }

  onReceiveMessageEdited(callback: ReceiveMessageEditedCallback): () => void {
    this.receiveMessageEditedCallbacks.add(callback);
    return () => { this.receiveMessageEditedCallbacks.delete(callback); };
  }

  onReceiveMessageDeleted(callback: ReceiveMessageDeletedCallback): () => void {
    this.receiveMessageDeletedCallbacks.add(callback);
    return () => { this.receiveMessageDeletedCallbacks.delete(callback); };
  }

  onReceiveMessageReacted(callback: ReceiveMessageReactedCallback): () => void {
    this.receiveMessageReactedCallbacks.add(callback);
    return () => { this.receiveMessageReactedCallbacks.delete(callback); };
  }

  onReceiveMessageReactedRemoved(callback: ReceiveMessageReactedRemovedCallback): () => void {
    this.receiveMessageReactedRemovedCallbacks.add(callback);
    return () => { this.receiveMessageReactedRemovedCallbacks.delete(callback); };
  }

  onReceiveMessagesRead(callback: ReceiveMessagesReadCallback): () => void {
    this.receiveMessagesReadCallbacks.add(callback);
    return () => { this.receiveMessagesReadCallbacks.delete(callback); };
  }

  onReceiveNewConversation(callback: ReceiveNewConversationCallback): void {
    this.receiveNewConversationCallback = callback;
  }

  onReceiveFriendshipCreated(callback: ReceiveFriendshipCreatedCallback): () => void {
    this.receiveFriendshipCreatedCallbacks.add(callback);
    return () => { this.receiveFriendshipCreatedCallbacks.delete(callback); };
  }

  onReceiveFriendshipAccepted(callback: ReceiveFriendshipAcceptedCallback): () => void {
    this.receiveFriendshipAcceptedCallbacks.add(callback);
    return () => { this.receiveFriendshipAcceptedCallbacks.delete(callback); };
  }

  onReceiveFriendshipBlocked(callback: ReceiveFriendshipBlockedCallback): () => void {
    this.receiveFriendshipBlockedCallbacks.add(callback);
    return () => { this.receiveFriendshipBlockedCallbacks.delete(callback); };
  }

  onReceiveFriendshipUnblocked(callback: ReceiveFriendshipUnblockedCallback): () => void {
    this.receiveFriendshipUnblockedCallbacks.add(callback);
    return () => { this.receiveFriendshipUnblockedCallbacks.delete(callback); };
  }

  onReceiveChatBlocked(callback: ReceiveChatBlockedCallback): () => void {
    this.receiveChatBlockedCallbacks.add(callback);
    return () => { this.receiveChatBlockedCallbacks.delete(callback); };
  }

  onReceiveChatUnblocked(callback: ReceiveChatUnblockedCallback): () => void {
    this.receiveChatUnblockedCallbacks.add(callback);
    return () => { this.receiveChatUnblockedCallbacks.delete(callback); };
  }

  onReceiveTyping(callback: ReceiveTypingCallback): () => void {
    this.receiveTypingCallbacks.add(callback);
    return () => { this.receiveTypingCallbacks.delete(callback); };
  }

  onReceiveCall(callback: ReceiveCallCallback): () => void {
    this.receiveCallCallbacks.add(callback);
    return () => { this.receiveCallCallbacks.delete(callback); };
  }

  onReceiveCallSignal(callback: ReceiveCallSignalCallback): () => void {
    this.receiveCallSignalCallbacks.add(callback);
    return () => { this.receiveCallSignalCallbacks.delete(callback); };
  }

  onReceiveMomentReacted(callback: ReceiveMomentReactedCallback): () => void {
    this.receiveMomentReactedCallbacks.add(callback);
    return () => { this.receiveMomentReactedCallbacks.delete(callback); };
  }

  onReceiveFileMarkedSuccess(callback: ReceiveFileMarkedSuccessCallback): () => void {
    this.receiveFileMarkedSuccessCallbacks.add(callback);
    return () => { this.receiveFileMarkedSuccessCallbacks.delete(callback); };
  }

  getConnection(): signalR.HubConnection | null {
    return this.connection;
  }
}

export const appHub = new AppHub();