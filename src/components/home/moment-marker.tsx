"use client";

import { useState } from "react";
import Image from "next/image";
import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { Camera } from "lucide-react";
import { getMomentThumbnail } from "@/services/moment";
import type { MomentDto } from "@/types/moment";

interface MomentMarkerProps {
  moment: MomentDto;
  onClick?: () => void;
}

export const MomentMarker = ({ moment, onClick }: MomentMarkerProps) => {
  const [hovered, setHovered] = useState(false);
  const thumb = getMomentThumbnail(moment);

  return (
    <AdvancedMarker
      position={{ lat: moment.location!.latitude, lng: moment.location!.longitude }}
      title={moment.caption ?? `${moment.userName}'s moment`}
      zIndex={100}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <div
        className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white shadow-md transition-transform duration-200"
        style={{
          transform: hovered ? "scale(1.15)" : "scale(1)",
        }}
      >
        {thumb ? (
          <Image
            src={thumb.thumbUrl}
            alt={moment.caption ?? "moment"}
            fill
            sizes="40px"
            className="object-cover"
          />
        ) : (
          <Camera className="h-5 w-5 text-zinc-500" />
        )}
      </div>
    </AdvancedMarker>
  );
};
