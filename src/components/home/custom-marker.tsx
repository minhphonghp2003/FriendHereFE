"use client";

import { useState, useMemo } from "react";
import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { cn } from "@/lib/utils";

const MARKER_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
  "#e11d48",
  "#84cc16",
  "#a855f7",
];

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MARKER_COLORS[Math.abs(hash) % MARKER_COLORS.length];
};

interface CustomMarkerProps {
  position: google.maps.LatLngLiteral;
  name: string;
  image?: string;
  isCurrentUser?: boolean;
  onClick?: () => void;
}

export const CustomMarker = ({ position, name, image, isCurrentUser, onClick }: CustomMarkerProps) => {
  const [hovered, setHovered] = useState(false);

  const color = useMemo(() => stringToColor(name), [name]);
  const firstLetter = name?.charAt(0).toUpperCase() || "?";

  return (
    <AdvancedMarker
      position={position}
      title={name}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border-2 border-white shadow-md transition-transform duration-200",
          hovered && "scale-110",
        )}
        style={{ backgroundColor: isCurrentUser ? "#3b82f6" : color }}
      >
        {image ? (
          <img
            src={image}
            alt={name}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <span className="text-sm font-bold text-white">{firstLetter}</span>
        )}
      </div>
    </AdvancedMarker>
  );
};
