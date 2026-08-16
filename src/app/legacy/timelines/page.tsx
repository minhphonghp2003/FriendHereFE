"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { TimelineList } from "@/components/timelines/timeline-list";
import { CreateTimelineDialog } from "@/components/timelines/create-timeline-dialog";
import { Button } from "@/components/ui/button";

export default function TimelinesPage() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold">Dòng thời gian</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Tạo
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <TimelineList
          key={refreshKey}
          currentUserId={user?.id}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      </div>

      <CreateTimelineDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
