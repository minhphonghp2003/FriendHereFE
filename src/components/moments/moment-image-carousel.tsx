"use client";

import { useState, useRef } from "react";
import type { MomentImage } from "@/types/moment";

interface MomentImageCarouselProps {
  images: MomentImage[];
  fullscreen?: boolean;
  showInfo?: boolean;
  onToggleInfo?: () => void;
}

const SWIPE_THRESHOLD = 50;

export const MomentImageCarousel = ({
  images,
  fullscreen = false,
  showInfo = true,
  onToggleInfo,
}: MomentImageCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const draggedRef = useRef(false);

  if (!images.length) return null;

  const goNext = () => setCurrentIndex((i) => (i === images.length - 1 ? 0 : i + 1));
  const goPrev = () => setCurrentIndex((i) => (i === 0 ? images.length - 1 : i - 1));

  const handleDragStart = (clientX: number) => {
    startXRef.current = clientX;
    setIsDragging(true);
    draggedRef.current = false;
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return;
    const diff = clientX - startXRef.current;
    if (Math.abs(diff) > 5) draggedRef.current = true;
    setOffsetX(diff);
  };

  const handleDragEnd = (clientX: number) => {
    if (!isDragging) return;
    setIsDragging(false);
    const diff = clientX - startXRef.current;
    if (Math.abs(diff) >= SWIPE_THRESHOLD) {
      if (diff > 0) {
        goPrev();
      } else {
        goNext();
      }
    }
    setOffsetX(0);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (draggedRef.current) return;
    if (images.length < 2) {
      onToggleInfo?.();
      return;
    }
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const third = rect.width / 3;
    if (x < third || x > rect.width - third) {
      if (x < third) {
        goPrev();
      } else {
        goNext();
      }
    } else {
      onToggleInfo?.();
    }
  };

  const translateX = isDragging
    ? ((offsetX / (containerRef.current?.offsetWidth || 1)) - currentIndex) * (100 / images.length)
    : -currentIndex * (100 / images.length);

  return (
    <div ref={containerRef} className={`relative overflow-hidden bg-black ${fullscreen ? "h-full w-full" : "aspect-square w-full"}`}>
      <div
        className="flex h-full"
        style={{
          width: `${images.length * 100}%`,
          transform: `translateX(${translateX}%)`,
          transition: isDragging ? "none" : "transform 0.3s ease-out",
        }}
        onClick={handleClick}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
        onTouchEnd={(e) => handleDragEnd(e.changedTouches[0].clientX)}
        onMouseDown={(e) => handleDragStart(e.clientX)}
        onMouseMove={(e) => e.buttons === 1 && handleDragMove(e.clientX)}
        onMouseUp={(e) => handleDragEnd(e.clientX)}
        onMouseLeave={(e) => isDragging && handleDragEnd(e.clientX)}
      >
        {images.map((img, i) => (
          <div key={i} className="relative h-full" style={{ width: `${100 / images.length}%` }}>
            <img
              src={img.originalUrl}
              alt=""
              className={`h-full w-full select-none ${fullscreen ? "object-contain" : "object-cover"}`}
              draggable={false}
            />
          </div>
        ))}
      </div>
      {images.length > 1 && showInfo && (
        <div className={`absolute left-1/2 flex -translate-x-1/2 gap-1 ${fullscreen ? "bottom-20" : "bottom-2"}`}>
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
