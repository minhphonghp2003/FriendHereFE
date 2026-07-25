export type FriendshipStatus = "Pending" | "Accepted" | "Rejected" | "Blocked" | "Removed";

export type FriendshipType = "Friend" | "BestFriend" | "Lover";

export interface FriendshipDto {
  id: number;
  user1Id: number;
  user2Id: number;
  status: FriendshipStatus;
  type: FriendshipType;
  requestedById: number;
  blockedById: number | null;
  createdAt: string;
}
