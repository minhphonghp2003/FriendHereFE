"use client";

import { useState, useRef } from "react";
import type { MomentImage } from "@/types/moment";

interface MomentImageCarouselProps {
  images: MomentImage[];
}

const SWIPE_THRESHOLD = 50;

export const MomentImageCarousel = ({ images }: MomentImageCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartRef = useRef<number | null>(null);

  if (!images.length) return null;

  const goNext = () => setCurrentIndex((i) => (i === images.length - 1 ? 0 : i + 1));
  const goPrev = () => setCurrentIndex((i) => (i === 0 ? images.length - 1 : i - 1));

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (images.length < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 2) {
      goPrev();
    } else {
      goNext();
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartRef.current === null || images.length < 2) return;
    const diff = e.changedTouches[0].clientX - touchStartRef.current;
    touchStartRef.current = null;
    if (Math.abs(diff) < SWIPE_THRESHOLD) return;
    if (diff > 0) {
      goPrev();
    } else {
      goNext();
    }
  };

  return (
    <div className="relative aspect-square w-full overflow-hidden bg-muted">
      <div
        className="h-full w-full"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={images[currentIndex].originalUrl}
          alt=""
          className="h-full w-full cursor-pointer object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
          {images.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${
                i === currentIndex ? "bg-white" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
