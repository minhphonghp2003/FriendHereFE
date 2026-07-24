import * as signalR from "@microsoft/signalr";
import { env } from "@/config/env";
import { TOKEN_KEY } from "@/constants";
import type { MessageDto, ConversationDto, SendMessageRequest } from "@/types/chat";

export type KickedCallback = () => void;
export type ReceiveMessageCallback = (message: MessageDto) => void;
export type ReceiveNewConversationCallback = (conversation: ConversationDto, initialMessage: MessageDto) => void;

class AppHub {
  private connection: signalR.HubConnection | null = null;
  private epoch = 0;
  private kickedCallback: KickedCallback | null = null;
  private receiveMessageCallback: ReceiveMessageCallback | null = null;
  private receiveNewConversationCallback: ReceiveNewConversationCallback | null = null;
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
      this.receiveMessageCallback?.(message);
    });

    this.connection.on("ReceiveNewConversation", (conversation: ConversationDto, initialMessage: MessageDto) => {
      this.receiveNewConversationCallback?.(conversation, initialMessage);
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

  onReceiveMessage(callback: ReceiveMessageCallback): void {
    this.receiveMessageCallback = callback;
  }

  onReceiveNewConversation(callback: ReceiveNewConversationCallback): void {
    this.receiveNewConversationCallback = callback;
  }

  getConnection(): signalR.HubConnection | null {
    return this.connection;
  }
}

export const appHub = new AppHub();