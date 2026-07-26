export type FriendshipStatus = "Pending" | "Accepted" | "Rejected" | "Blocked" | "Removed";

export type FriendshipType = "Friend" | "BestFriend" | "Lover";

export interface FriendshipDto {
  id: number;
  user1Id: number;
  user2Id: number;
  status: FriendshipStatus | number;
  type: FriendshipType | number;
  requestedById: number;
  blockedById: number | null;
  createdAt: string;
  otherUserName: string;
  otherUserImage: { originalUrl: string; thumbUrl: string } | null;
}

export function isPendingStatus(f: { status: string | number }): boolean {
  return f.status === "Pending" || f.status === 0;
}

export function isAcceptedStatus(f: { status: string | number }): boolean {
  return f.status === "Accepted" || f.status === 1;
}

export function isRemovedStatus(f: { status: string | number }): boolean {
  return f.status === "Removed" || f.status === 4;
}

export function isPending(f: FriendshipDto): boolean {
  return isPendingStatus(f);
}

export function isAccepted(f: FriendshipDto): boolean {
  return isAcceptedStatus(f);
}

export function isRemoved(f: FriendshipDto): boolean {
  return isRemovedStatus(f);
}

export function isBlockedStatus(f: { status: string | number }): boolean {
  return f.status === "Blocked" || f.status === 2;
}

export function isBlocked(f: FriendshipDto): boolean {
  return isBlockedStatus(f);
}
