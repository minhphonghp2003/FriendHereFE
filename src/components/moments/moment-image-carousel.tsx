"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ImageLightbox } from "@/components/common/image-lightbox";
import type { MomentImage } from "@/types/moment";

interface MomentImageCarouselProps {
  images: MomentImage[];
}

export const MomentImageCarousel = ({ images }: MomentImageCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!images.length) return null;

  const handlePrev = () => setCurrentIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  const handleNext = () => setCurrentIndex((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <>
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        <button
          className="h-full w-full cursor-pointer"
          onClick={() => setLightboxOpen(true)}
        >
          <img
            src={images[currentIndex].originalUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </button>
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
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
          </>
        )}
      </div>
      <ImageLightbox
        images={images}
        initialIndex={currentIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
};
