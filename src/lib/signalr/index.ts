import * as signalR from "@microsoft/signalr";
import { env } from "@/config/env";
import { TOKEN_KEY } from "@/constants";
import type { LocationDto, UserDto, JoinLocationInput } from "./types";

export type ReceiveLocationsCallback = (locations: LocationDto[]) => void;
export type NewJoinCallback = (user: UserDto, location: LocationDto) => void;
export type UserDisconnectCallback = (userId: number) => void;
export type KickedCallback = () => void;

class LocationHub {
  private connection: signalR.HubConnection | null = null;
  private epoch = 0;
  private receiveLocationsCallback: ReceiveLocationsCallback | null = null;
  private newJoinCallback: NewJoinCallback | null = null;
  private userDisconnectCallback: UserDisconnectCallback | null = null;
  private kickedCallback: KickedCallback | null = null;

  async start(userId?: number): Promise<void> {
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

    const url = userId
      ? `${env.NEXT_PUBLIC_SIGNALR_URL}?userId=${userId}`
      : env.NEXT_PUBLIC_SIGNALR_URL;

    const logger: signalR.ILogger = {
      log(logLevel: signalR.LogLevel, message: string): void {
        if (message.includes("stopped during negotiation")) return;
        switch (logLevel) {
          case signalR.LogLevel.Error:
            console.error(message);
            break;
          case signalR.LogLevel.Warning:
            console.warn(message);
            break;
          default:
            console.log(message);
            break;
        }
      },
    };

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => {
          if (typeof window === "undefined") return "";
          return localStorage.getItem(TOKEN_KEY) ?? "";
        },
      })
      .withAutomaticReconnect()
      .configureLogging(logger)
      .build();

    this.connection.on("ReceiveLocations", (locations: LocationDto[]) => {
      this.receiveLocationsCallback?.(locations);
    });

    this.connection.on("NewJoin", (user: UserDto, location: LocationDto) => {
      this.newJoinCallback?.(user, location);
    });

    this.connection.on("ReceiveUserDisconnect", (userId: number) => {
      console.log("[SignalR] User disconnected:", userId);
      this.userDisconnectCallback?.(userId);
    });

    this.connection.on("ReceiveKicked", () => {
      console.log("[SignalR] Kicked by another session");
      this.kickedCallback?.();
    });

    try {
      await this.connection.start();
      console.log("SignalR connected.");
    } catch (err) {
      if (myEpoch === this.epoch) {
        console.error("SignalR connection error:", err);
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

  async join(input: JoinLocationInput): Promise<void> {
    if (!this.connection) {
      throw new Error("Connection not started. Call start() first.");
    }
    await this.connection.invoke("Join", input);
  }

  onReceiveLocations(callback: ReceiveLocationsCallback): void {
    this.receiveLocationsCallback = callback;
  }

  onNewJoin(callback: NewJoinCallback): void {
    this.newJoinCallback = callback;
  }

  onUserDisconnect(callback: UserDisconnectCallback): void {
    this.userDisconnectCallback = callback;
  }

  onKicked(callback: KickedCallback): void {
    this.kickedCallback = callback;
  }

  getConnection(): signalR.HubConnection | null {
    return this.connection;
  }
}

export const locationHub = new LocationHub();
