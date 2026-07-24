"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { User } from "@/types/user";

interface UserCardProps {
  user: User;
  onDelete?: (id: number) => void;
}

export const UserCard = ({ user, onDelete }: UserCardProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{user.name}</CardTitle>
        <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800">
          User
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-zinc-500">{user.email}</p>
        <p className="text-xs text-zinc-400">Age: {user.age}</p>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-red-600 hover:text-red-700"
            onClick={() => onDelete(user.id)}
          >
            Delete
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
