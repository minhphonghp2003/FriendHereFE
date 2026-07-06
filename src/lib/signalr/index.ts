import * as signalR from "@microsoft/signalr";
import { env } from "@/config/env";
import type { LocationDto, UserDto, JoinLocationInput } from "./types";

export type ReceiveLocationsCallback = (locations: LocationDto[]) => void;
export type NewJoinCallback = (user: UserDto, location: LocationDto) => void;

class LocationHub {
  private connection: signalR.HubConnection | null = null;
  private receiveLocationsCallback: ReceiveLocationsCallback | null = null;
  private newJoinCallback: NewJoinCallback | null = null;

  async start(): Promise<void> {
    if (this.connection) {
      return;
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(env.NEXT_PUBLIC_SIGNALR_URL)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.connection.on("ReceiveLocations", (locations: LocationDto[]) => {
      this.receiveLocationsCallback?.(locations);
    });

    this.connection.on("NewJoin", (user: UserDto, location: LocationDto) => {
      this.newJoinCallback?.(user, location);
    });

    try {
      await this.connection.start();
      console.log("SignalR connected.");
    } catch (err) {
      console.error("SignalR connection error:", err);
      throw err;
    }
  }

  async stop(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
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

  getConnection(): signalR.HubConnection | null {
    return this.connection;
  }
}

export const locationHub = new LocationHub();
