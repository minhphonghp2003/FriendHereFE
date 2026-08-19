"use client";

import React, { useRef, useCallback, useState, useEffect } from "react";

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  itemHeight: number;
  hasNextPage?: boolean;
  loadNextPage?: () => void | Promise<void>;
  isLoading?: boolean;
  className?: string;
  height?: string | number;
}

/**
 * VirtualizedList - A simple virtualized list for performance
 * 
 * Features:
 * - Windowing/virtualization for optimal performance  
 * - Infinite scroll support
 * - Memory efficient rendering
 */
export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight,
  hasNextPage = false,
  loadNextPage,
  isLoading = false,
  className = "",
  height = "100%",
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
    };

    updateHeight();
    
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);
    
    return () => resizeObserver.disconnect();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollTop = e.currentTarget.scrollTop;
    setScrollTop(currentScrollTop);

    // Infinite scroll trigger
    const scrollHeight = e.currentTarget.scrollHeight;
    const clientHeight = e.currentTarget.clientHeight;
    const scrollBottom = scrollHeight - (currentScrollTop + clientHeight);

    if (hasNextPage && !isLoading && loadNextPage && scrollBottom < itemHeight * 3) {
      loadNextPage();
    }
  }, [hasNextPage, isLoading, loadNextPage, itemHeight]);

  // Calculate visible items
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 2;
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount, items.length);
  
  const visibleItems = items.slice(Math.max(0, startIndex - 2), endIndex + 2);
  const offsetIndex = Math.max(0, startIndex - 2);

  const totalHeight = items.length * itemHeight;

  return (
    <div 
      ref={containerRef}
      className={`virtual-list-wrapper ${className}`}
      style={{ height, overflow: "auto", position: "relative" }}
      onScroll={handleScroll}
    >
      {/* Spacer for content before visible items */}
      <div style={{ height: Math.max(0, offsetIndex * itemHeight) }} />
      
      {/* Visible items */}
      {visibleItems.map((item, i) => {
        const actualIndex = offsetIndex + i;
        const style: React.CSSProperties = {
          position: "absolute",
          top: `${actualIndex * itemHeight}px`,
          left: 0,
          right: 0,
          height: `${itemHeight}px`,
        };
        return (
          <div key={actualIndex} style={style}>
            {renderItem(item, actualIndex, style)}
          </div>
        );
      })}
      
      {/* Spacer for content after visible items */}
      <div style={{ height: Math.max(0, (items.length - endIndex) * itemHeight) }} />
      
      {/* Loading indicator */}
      {isLoading && hasNextPage && (
        <div 
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: `${itemHeight}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="virtual-list-spinner" />
        </div>
      )}

      <style jsx>{`
        .virtual-list-wrapper {
          position: relative;
          width: 100%;
          overflow: auto;
          -webkit-overflow-scrolling: touch;
        }
        
        .virtual-list-spinner {
          width: 24px;
          height: 24px;
          border: 2.5px solid #e4e4e7;
          border-top-color: #2bb0af;
          border-radius: 50%;
          animation: virtual-spin 0.8s linear infinite;
        }
        
        @keyframes virtual-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}