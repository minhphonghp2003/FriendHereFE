"use client";

import { useState, useMemo, useId } from "react";
import { AdvancedMarker } from "@vis.gl/react-google-maps";

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
  moving?: boolean;
  onClick?: () => void;
}

export const CustomMarker = ({ position, name, image, isCurrentUser, moving, onClick }: CustomMarkerProps) => {
  const [hovered, setHovered] = useState(false);
  const clipId = useId();

  const color = useMemo(() => stringToColor(name), [name]);
  const firstLetter = name?.charAt(0).toUpperCase() || "?";

  const pinColor = isCurrentUser ? "#3b82f6" : color;

  return (
    <AdvancedMarker
      position={position}
      title={name}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <div
        className={`transition-transform duration-200 ${moving ? "marker-glow" : ""}`}
        style={{
          marginTop: -26,
          transform: hovered ? "scale(1.1)" : "scale(1)",
          transformOrigin: "bottom center",
          filter: moving
            ? "drop-shadow(0 2px 6px rgba(0,0,0,0.3)) drop-shadow(0 0 12px " + pinColor + ")"
            : "drop-shadow(0 2px 6px rgba(0,0,0,0.3))",
        }}
      >
        <svg
          width="48"
          height="52"
          viewBox="0 0 48 52"
          style={{ display: "block" }}
        >
          <defs>
            <clipPath id={clipId}>
              <circle cx="24" cy="24" r="16" />
            </clipPath>
            {moving && (
              <>
                <style>{`@keyframes markerPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.9; } }`}</style>
              </>
            )}
          </defs>
          {moving && (
            <circle
              cx="24" cy="24" r="22"
              fill="none"
              stroke={pinColor}
              strokeWidth="2.5"
              opacity="0.5"
              style={{ animation: "markerPulse 1s ease-in-out infinite" }}
            />
          )}
          <path
            d="M 4 24 A 20 20 0 1 1 44 24 C 44 34 36 42 24 52 C 12 42 4 34 4 24 Z"
            fill={pinColor}
            stroke="white"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {image ? (
            <image
              href={image}
              x="8" y="8" width="32" height="32"
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#${clipId})`}
            />
          ) : (
            <>
              <circle cx="24" cy="24" r="16" fill={pinColor} clipPath={`url(#${clipId})`} />
              <text
                x="24" y="24.5"
                textAnchor="middle" dominantBaseline="central"
                fill="white"
                fontSize="18"
                fontWeight="bold"
              >
                {firstLetter}
              </text>
            </>
          )}
        </svg>
      </div>
    </AdvancedMarker>
  );
};
