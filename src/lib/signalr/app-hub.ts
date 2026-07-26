import * as signalR from "@microsoft/signalr";
import { env } from "@/config/env";
import { TOKEN_KEY } from "@/constants";
import type { MessageDto, ConversationDto, SendMessageRequest } from "@/types/chat";
import type { FriendshipDto } from "@/types/friendship";

export type KickedCallback = () => void;
export type ReceiveMessageCallback = (message: MessageDto) => void;
export type ReceiveNewConversationCallback = (conversation: ConversationDto, initialMessage: MessageDto) => void;
export type ReceiveFriendshipCreatedCallback = (dto: FriendshipDto) => void;
export type ReceiveFriendshipAcceptedCallback = (dto: FriendshipDto) => void;
export type ReceiveFriendshipBlockedCallback = (dto: FriendshipDto) => void;
export type ReceiveFriendshipUnblockedCallback = (dto: FriendshipDto) => void;

export interface ChatBlockedData {
  targetUserId: number;
}

export type ReceiveChatBlockedCallback = (data: ChatBlockedData) => void;
export type ReceiveChatUnblockedCallback = (data: ChatBlockedData) => void;

class AppHub {
  private connection: signalR.HubConnection | null = null;
  private epoch = 0;
  private kickedCallback: KickedCallback | null = null;
  private receiveMessageCallbacks: Set<ReceiveMessageCallback> = new Set();
  private receiveNewConversationCallback: ReceiveNewConversationCallback | null = null;
  private receiveFriendshipCreatedCallbacks: Set<ReceiveFriendshipCreatedCallback> = new Set();
  private receiveFriendshipAcceptedCallbacks: Set<ReceiveFriendshipAcceptedCallback> = new Set();
  private receiveFriendshipBlockedCallbacks: Set<ReceiveFriendshipBlockedCallback> = new Set();
  private receiveFriendshipUnblockedCallbacks: Set<ReceiveFriendshipUnblockedCallback> = new Set();
  private receiveChatBlockedCallbacks: Set<ReceiveChatBlockedCallback> = new Set();
  private receiveChatUnblockedCallbacks: Set<ReceiveChatUnblockedCallback> = new Set();
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
      await this.connection.start();
      console.log("[AppHub] Connected");
    } catch (err) {
      if (myEpoch === this.epoch) {
        this.connection = null;
        throw err;
      }
    }
  }

  async stop(): Promise<void> {
    ++this.epoch;
    this.joinedConversations.clear();
    this.receiveFriendshipCreatedCallbacks.clear();
    this.receiveFriendshipAcceptedCallbacks.clear();
    this.receiveFriendshipBlockedCallbacks.clear();
    this.receiveFriendshipUnblockedCallbacks.clear();
    this.receiveChatBlockedCallbacks.clear();
    this.receiveChatUnblockedCallbacks.clear();
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

  async joinConversation(id: number): Promise<void> {
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

  getConnection(): signalR.HubConnection | null {
    return this.connection;
  }
}

export const appHub = new AppHub();