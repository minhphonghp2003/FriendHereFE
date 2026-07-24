"use client";

import { UserCard } from "./user-card";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import type { User } from "@/types/user";

interface UserListProps {
  users?: User[];
  isLoading?: boolean;
  error?: Error | null;
}

export const UserList = ({ users, isLoading, error }: UserListProps) => {
  if (isLoading) return <LoadingSpinner />;
  if (error) return <p className="text-sm text-red-500">Failed to load users</p>;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {users?.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
};
