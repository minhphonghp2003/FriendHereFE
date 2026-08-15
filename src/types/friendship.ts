export type FriendshipStatus = "Pending" | "Accepted" | "Rejected" | "Blocked" | "Removed";

export type FriendshipType = "Friend" | "BestFriend" | "Lover";

export const FRIENDSHIP_TYPE_VALUES = {
  Friend: 0,
  BestFriend: 1,
  Lover: 2,
} as const;

export type FriendshipTypeValue =
  (typeof FRIENDSHIP_TYPE_VALUES)[keyof typeof FRIENDSHIP_TYPE_VALUES];

export const FRIENDSHIP_TYPE_LABELS: Record<FriendshipTypeValue, string> = {
  [FRIENDSHIP_TYPE_VALUES.Friend]: "Bạn thường",
  [FRIENDSHIP_TYPE_VALUES.BestFriend]: "Bạn thân",
  [FRIENDSHIP_TYPE_VALUES.Lover]: "Người yêu",
};

export interface FriendshipDto {
  id: number;
  user1Id: number;
  user2Id: number;
  status: FriendshipStatus | number;
  type1: FriendshipType | number;
  type2: FriendshipType | number;
  requestedById: number;
  blockedById: number | null;
  createdAt: string;
  otherUserName: string;
  otherUserImage: { originalUrl: string; thumbUrl: string } | null;
}

export function normalizeFriendshipType(type: FriendshipType | number): FriendshipTypeValue {
  if (type === "BestFriend") return FRIENDSHIP_TYPE_VALUES.BestFriend;
  if (type === "Lover") return FRIENDSHIP_TYPE_VALUES.Lover;
  if (typeof type === "number" && (type === 1 || type === 2)) return type;
  return FRIENDSHIP_TYPE_VALUES.Friend;
}

export function getMyFriendshipType(
  f: Pick<FriendshipDto, "user1Id" | "user2Id" | "type1" | "type2">,
  myUserId: number | undefined,
): FriendshipTypeValue {
  if (!myUserId) return FRIENDSHIP_TYPE_VALUES.Friend;
  return f.user1Id === myUserId
    ? normalizeFriendshipType(f.type1)
    : normalizeFriendshipType(f.type2);
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
