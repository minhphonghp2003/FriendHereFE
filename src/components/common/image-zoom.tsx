"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";

interface ImageZoomProps {
  src: string;
  alt: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * ImageZoom - A wrapper component that enables zoom/pan functionality for images
 * 
 * Features:
 * - Double-tap to zoom in/out
 * - Pinch-to-zoom support
 * - Pan when zoomed
 * - Smooth animations
 * - Works with existing image components
 */
export const ImageZoom = ({ src, alt, className = "", children }: ImageZoomProps) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Touch handling for pinch zoom
  const initialPinchDistance = useRef<number | null>(null);
  const initialScale = useRef<number>(1);

  // Dispatch events to hide/show scroll-to-top button when zoomed
  useEffect(() => {
    if (isZoomed) {
      window.dispatchEvent(new Event("v2:sheet-open"));
    } else {
      window.dispatchEvent(new Event("v2:sheet-close"));
    }
  }, [isZoomed]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsZoomed(!isZoomed);
    if (!isZoomed) {
      // Center the zoom on the click point
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * -100;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * -100;
      setPosition({ x, y });
      setScale(2);
    } else {
      setPosition({ x: 0, y: 0 });
      setScale(1);
    }
  }, [isZoomed]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialPinchDistance.current = Math.sqrt(dx * dx + dy * dy);
      initialScale.current = scale;
    }
  }, [scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance.current !== null) {
      e.preventDefault();
      // Pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const newScale = Math.min(Math.max(
        initialScale.current * (distance / initialPinchDistance.current),
        1
      ), 4);
      
      setScale(newScale);
      setIsZoomed(newScale > 1);
      
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isZoomed) {
      // Pan when zoomed
      e.preventDefault();
      const touch = e.touches[0];
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const x = ((touch.clientX - rect.left) / rect.width - 0.5) * -100 * (scale - 1);
        const y = ((touch.clientY - rect.top) / rect.height - 0.5) * -100 * (scale - 1);
        setPosition({ x, y });
      }
    }
  }, [isZoomed, scale]);

  const handleTouchEnd = useCallback(() => {
    initialPinchDistance.current = null;
  }, []);

  const handleClose = useCallback(() => {
    setIsZoomed(false);
    setPosition({ x: 0, y: 0 });
    setScale(1);
  }, []);

  // Handle escape key
  useEffect(() => {
    if (!isZoomed) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isZoomed, handleClose]);

  // Prevent body scroll when zoomed
  useEffect(() => {
    if (isZoomed) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isZoomed]);

  return (
    <>
      <div
        ref={containerRef}
        className={`image-zoom-container ${isZoomed ? 'zoomed' : ''} ${className}`}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          cursor: isZoomed ? 'zoom-out' : 'zoom-in',
          overflow: isZoomed ? 'visible' : 'hidden',
        }}
      >
        {children || (
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            className="image-zoom-img"
            draggable={false}
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}%, ${position.y / scale}%)`,
              transition: isZoomed ? 'transform 0.3s ease-out' : 'transform 0.2s ease-in',
            }}
          />
        )}
      </div>

      {isZoomed && (
        <div className="image-zoom-backdrop" onClick={handleClose}>
          <div 
            className="image-zoom-fullscreen"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={handleClose}
          >
            <img
              src={src}
              alt={alt}
              className="image-zoom-fullscreen-img"
              draggable={false}
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}%, ${position.y / scale}%)`,
              }}
            />
          </div>
          <button className="image-zoom-close" onClick={handleClose} aria-label="Đóng">
            ✕
          </button>
        </div>
      )}

      <style jsx>{`
        .image-zoom-container {
          position: relative;
          display: inline-block;
          overflow: hidden;
          border-radius: inherit;
        }

        .image-zoom-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transform-origin: center center;
          will-change: transform;
        }

        .image-zoom-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9998;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: image-zoom-fade-in 0.2s ease;
          touch-action: none;
        }

        @keyframes image-zoom-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .image-zoom-fullscreen {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .image-zoom-fullscreen-img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          transform-origin: center center;
          will-change: transform;
        }

        .image-zoom-close {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 40px;
          height: 40px;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border-radius: 50%;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
          transition: background 0.2s;
        }

        .image-zoom-close:active {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </>
  );
};