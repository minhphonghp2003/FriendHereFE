import * as signalR from "@microsoft/signalr";
import { env } from "@/config/env";
import { TOKEN_KEY } from "@/constants";
import type { JoinRequest, LocationDto, UserDto } from "./types";

export type ReceiveLocationsCallback = (locations: LocationDto[]) => void;
export type NewJoinCallback = (user: UserDto, location: LocationDto) => void;
export type UserDisconnectCallback = (userId: number) => void;
export type ReceiveOtherMovementCallback = (location: LocationDto) => void;
export type ReceiveVisibilityUpdatedCallback = (location: LocationDto) => void;
export type ReceiveBatteryUpdatedCallback = (location: LocationDto) => void;

class LocationHub {
  private connection: signalR.HubConnection | null = null;
  private epoch = 0;
  private receiveLocationsCallback: ReceiveLocationsCallback | null = null;
  private newJoinCallback: NewJoinCallback | null = null;
  private userDisconnectCallback: UserDisconnectCallback | null = null;
  private receiveOtherMovementCallback: ReceiveOtherMovementCallback | null = null;
  private receiveVisibilityUpdatedCallback: ReceiveVisibilityUpdatedCallback | null = null;
  private receiveBatteryUpdatedCallback: ReceiveBatteryUpdatedCallback | null = null;

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
      console.warn("[LocationHub] No token available, skipping connection");
      return;
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(env.NEXT_PUBLIC_SIGNALR_URL, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
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

    this.connection.on("ReceiveOtherMovement", (location: LocationDto) => {
      this.receiveOtherMovementCallback?.(location);
    });

    this.connection.on("ReceiveVisibilityUpdated", (location: LocationDto) => {
      console.log("[SignalR] Visibility updated:", location);
      this.receiveVisibilityUpdatedCallback?.(location);
    });

    this.connection.on("ReceiveBatteryUpdated", (location: LocationDto) => {
      console.log("[SignalR] Battery updated:", location);
      this.receiveBatteryUpdatedCallback?.(location);
    });

    this.connection.onclose(() => {
      console.log("[LocationHub] Disconnected");
    });

    try {
      await this.connection.start();
      console.log("[LocationHub] Connected");
    } catch (err) {
      if (myEpoch === this.epoch) {
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

  async join(request: JoinRequest): Promise<void> {
    if (!this.connection) {
      throw new Error("Connection not started. Call start() first.");
    }
    await this.connection.invoke("Join", request);
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

  onReceiveOtherMovement(callback: ReceiveOtherMovementCallback): void {
    this.receiveOtherMovementCallback = callback;
  }

  onReceiveVisibilityUpdated(callback: ReceiveVisibilityUpdatedCallback): void {
    this.receiveVisibilityUpdatedCallback = callback;
  }

  onReceiveBatteryUpdated(callback: ReceiveBatteryUpdatedCallback): void {
    this.receiveBatteryUpdatedCallback = callback;
  }

  async updateLocation(latitude: number, longitude: number, accuracy?: number, speed?: number): Promise<void> {
    if (!this.connection) return;
    try {
      await this.connection.invoke("UpdateLocation", latitude, longitude, accuracy, speed);
    } catch (err) {
      console.error("[LocationHub] UpdateLocation error:", err);
    }
  }

  async updateVisibility(visibility: number): Promise<void> {
    if (!this.connection) return;
    try {
      await this.connection.invoke("UpdateVisibility", visibility);
    } catch (err) {
      console.error("[LocationHub] UpdateVisibility error:", err);
    }
  }

  async updateBattery(battery: number): Promise<void> {
    if (!this.connection) return;
    try {
      await this.connection.invoke("UpdateBattery", battery);
    } catch (err) {
      console.error("[LocationHub] UpdateBattery error:", err);
    }
  }

  getConnection(): signalR.HubConnection | null {
    return this.connection;
  }
}

export const locationHub = new LocationHub();
