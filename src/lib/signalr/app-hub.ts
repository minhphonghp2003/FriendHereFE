import * as signalR from "@microsoft/signalr";
import { env } from "@/config/env";
import { TOKEN_KEY } from "@/constants";

export type KickedCallback = () => void;

class AppHub {
  private connection: signalR.HubConnection | null = null;
  private epoch = 0;
  private kickedCallback: KickedCallback | null = null;

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
        // ignore stop errors during restart
      }
    }

    if (myEpoch !== this.epoch) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(env.NEXT_PUBLIC_SIGNALR_APP_URL, {
        accessTokenFactory: () => {
          if (typeof window === "undefined") return "";
          return localStorage.getItem(TOKEN_KEY) ?? "";
        },
      })
      .withAutomaticReconnect()
      .build();

    this.connection.on("ReceiveKicked", () => {
      console.log("[AppHub] Kicked by another connection");
      this.kickedCallback?.();
    });

    this.connection.onreconnecting(() => {
      console.log("[AppHub] Reconnecting...");
    });

    this.connection.onreconnected(() => {
      console.log("[AppHub] Reconnected");
    });

    try {
      await this.connection.start();
      console.log("[AppHub] Connected");
    } catch (err) {
      if (myEpoch === this.epoch) {
        console.error("[AppHub] Connection error:", err);
        throw err;
      }
    }
  }

  async stop(): Promise<void> {
    ++this.epoch;
    const conn = this.connection;
    if (conn) {
      this.connection = null;
      try {
        await conn.stop();
      } catch {
        // ignore stop errors
      }
    }
  }

  onKicked(callback: KickedCallback): void {
    this.kickedCallback = callback;
  }

  getConnection(): signalR.HubConnection | null {
    return this.connection;
  }
}

export const appHub = new AppHub();
