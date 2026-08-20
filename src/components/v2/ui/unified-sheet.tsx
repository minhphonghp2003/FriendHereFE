"use client";

import React, { ReactNode, HTMLAttributes, useState, useRef, useEffect, TouchEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface UnifiedSheetProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  showCloseButton?: boolean;
  maxHeight?: string;
  className?: string;
  enableDragClose?: boolean;
}

/**
 * UnifiedSheet - A standardized bottom sheet component following v2 UX/UI standards
 * 
 * Features:
 * - Consistent styling across all sheets
 * - Proper z-index layering (600 - above scroll-to-top, below header)
 * - Smooth animations
 * - Handle drag indicator for closing
 * - Responsive design with safe areas
 * - Keyboard escape support
 * - Drag-to-close functionality
 */
export const UnifiedSheet = ({
  open,
  onClose,
  title,
  children,
  showCloseButton = true,
  maxHeight = "70vh",
  className = "",
  enableDragClose = true,
  ...props
}: UnifiedSheetProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [sheetPosition, setSheetPosition] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const currentPositionRef = useRef<number | null>(null);

  // Handle keyboard escape
  React.useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  // Handle drag to close
  const handleTouchStart = (e: TouchEvent) => {
    if (!enableDragClose || !sheetRef.current) return;
    
    // Only detect swipes starting from the handle area
    const handle = e.currentTarget as HTMLElement;
    const handleRect = handle.getBoundingClientRect();
    
    // Check if touch started near the top handle
    const touch = e.touches[0];
    const relativeY = touch.clientY - handleRect.top;
    
    // Only allow drag from the handle area (top 40px)
    if (relativeY <= 40) {
      touchStartRef.current = touch.clientY;
      currentPositionRef.current = touch.clientY;
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || !sheetRef.current || touchStartRef.current === null) return;
    
    e.preventDefault();
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartRef.current!;
    
    // Calculate percentage moved (0 to 100%)
    const maxDrag = 300; // pixels to fully close
    const percentage = Math.min(Math.max((deltaY / maxDrag) * 100, 0), 100);
    
    setSheetPosition(percentage);
    
    // Auto-close when dragged past threshold
    if (percentage > 60) {
      handleDragComplete();
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const position = sheetPosition;
    
    // Reset drag state
    setIsDragging(false);
    touchStartRef.current = null;
    currentPositionRef.current = null;
    
    // If dragged past threshold, close the sheet
    if (position > 40) {
      handleDragComplete();
    } else {
      // Spring back if not dragged far enough
      setSheetPosition(0);
    }
  };

  const handleDragComplete = () => {
    setIsClosing(true);
    setSheetPosition(100);
    
    // Allow animation to complete before actually closing
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setSheetPosition(0);
      setIsDragging(false);
    }, 300);
  };

  if (!open) return null;

  const content = (
    <div className={`unified-sheet-backdrop ${isClosing ? 'closing' : ''}`} onClick={onClose}>
      <div 
        className="unified-sheet-container"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxHeight,
          transform: `translateY(${sheetPosition}%)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Draggable handle */}
        <div 
          className="unified-sheet-handle"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ 
            cursor: enableDragClose ? 'grab' : 'default',
            touchAction: enableDragClose ? 'pan-y' : 'auto',
          }}
        />
        
        {/* Header */}
        <div className="unified-sheet-header">
          {title && <h2 className="unified-sheet-title">{title}</h2>}
          {showCloseButton && (
            <button 
              onClick={onClose} 
              className="unified-sheet-close-btn"
              aria-label="Đóng"
            >
              <X className="unified-sheet-icon" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="unified-sheet-body">
          {children}
        </div>
      </div>
    </div>
  );

  // Use portal to render at document.body level
  return createPortal(content, document.body);
};