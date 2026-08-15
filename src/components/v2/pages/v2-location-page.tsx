"use client";

import { V2LocationMap } from "@/components/v2/pages/v2-location-map";
import { V2FriendsSheet } from "@/components/v2/pages/v2-friends-sheet";

export function V2LocationPage() {
  return (
    <div className="v2-location-container">
      <V2LocationMap />
      <V2FriendsSheet />
    </div>
  );
}