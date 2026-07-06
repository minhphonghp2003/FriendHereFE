"use client";

import { useDeleteWalkIn } from "../hooks";
import { UserCard } from "./user-card";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { toast } from "sonner";
import type { User } from "../types";

interface UserListProps {
  users?: User[];
  isLoading?: boolean;
  error?: Error | null;
}

export const UserList = ({ users, isLoading, error }: UserListProps) => {
  const deleteWalkIn = useDeleteWalkIn();

  const handleDelete = (id: number) => {
    deleteWalkIn.mutate(id, {
      onSuccess: () => toast.success("User deleted"),
      onError: () => toast.error("Failed to delete user"),
    });
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <p className="text-sm text-red-500">Failed to load users</p>;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {users?.map((user) => (
        <UserCard key={user.id} user={user} onDelete={handleDelete} />
      ))}
    </div>
  );
};
