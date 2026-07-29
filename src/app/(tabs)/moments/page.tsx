"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { MomentFeed } from "@/components/moments/moment-feed";
import { CreateMomentDialog } from "@/components/moments/create-moment-dialog";
import { Button } from "@/components/ui/button";

export default function MomentsPage() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Khoảnh khắc</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Đăng
        </Button>
      </div>

      <MomentFeed
        key={refreshKey}
        currentUserId={user?.id}
      />

      <CreateMomentDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
