"use client";

import { useUsers, useDeleteUser } from "../hooks";
import { UserCard } from "./user-card";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { toast } from "sonner";

export const UserList = () => {
  const { data, isLoading, error } = useUsers();
  const deleteUser = useDeleteUser();

  const handleDelete = (id: string) => {
    deleteUser.mutate(id, {
      onSuccess: () => toast.success("User deleted"),
      onError: () => toast.error("Failed to delete user"),
    });
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <p className="text-sm text-red-500">Failed to load users</p>;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data?.data.map((user) => (
        <UserCard key={user.id} user={user} onDelete={handleDelete} />
      ))}
    </div>
  );
};
