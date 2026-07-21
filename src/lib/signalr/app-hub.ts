import * as signalR from "@microsoft/signalr";
import { env } from "@/config/env";
import { TOKEN_KEY } from "@/constants";

export type KickedCallback = () => void;

const logger: signalR.ILogger = {
  log(logLevel: signalR.LogLevel, message: string): void {
    if (message.includes("stopped during negotiation")) {
      console.warn("[AppHub] Negotiation failed — server may be down or endpoint missing");
      return;
    }
    if (message.includes("WebSockets transport")) return;
    switch (logLevel) {
      case signalR.LogLevel.Error:
        console.error("[AppHub]", message);
        break;
      case signalR.LogLevel.Warning:
        console.warn("[AppHub]", message);
        break;
      default:
        console.log("[AppHub]", message);
        break;
    }
  },
};

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
      .configureLogging(logger)
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
        console.error("[AppHub] Failed to connect — ensure server is running and /App endpoint exists");
        this.connection = null;
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
