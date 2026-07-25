export type FriendshipStatus = "Pending" | "Accepted" | "Rejected" | "Blocked" | "Removed";

export interface FriendshipDto {
  id: number;
  user1Id: number;
  user2Id: number;
  status: FriendshipStatus;
  requestedById: number;
  blockedById: number | null;
  createdAt: string;
}
