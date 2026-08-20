"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import { List } from "react-window";

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
 * VirtualizedList - A high-performance list component using react-window
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
  const listRef = useRef<any>(null);
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

  // Check if an item is loaded
  const isItemLoaded = (index: number) => !hasNextPage || index < items.length;

  // Load more items
  const handleLoadMore = useCallback(() => {
    if (loadNextPage && !isLoading && hasNextPage) {
      loadNextPage();
    }
  }, [loadNextPage, isLoading, hasNextPage]);

  // Handle scroll to detect when to load more
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    
    // Load more when near bottom
    if (scrollBottom < itemHeight * 3 && hasNextPage && !isLoading) {
      handleLoadMore();
    }
  }, [itemHeight, hasNextPage, isLoading, handleLoadMore]);

  // Render each row
  const Row = ({ index, style }: any) => {
    // Show loading spinner at the bottom when loading more
    if (index === items.length) {
      return (
        <div style={style}>
          <div className="virtual-list-loading">
            <div className="virtual-list-spinner" />
          </div>
        </div>
      );
    }

    // Render actual item
    const item = items[index];
    if (!item) return null;

    return (
      <div style={style}>
        {renderItem(item, index, style)}
      </div>
    );
  };

  const itemCount = hasNextPage ? items.length + 1 : items.length;

  if (containerHeight === 0) {
    return <div ref={containerRef} className={`virtual-list-wrapper ${className}`} style={{ height }} />;
  }

  return (
    <div ref={containerRef} className={`virtual-list-wrapper ${className}`} style={{ height }} onScroll={handleScroll}>
      <List
        className="virtual-list"
        defaultHeight={containerHeight}
        rowCount={itemCount}
        rowHeight={itemHeight}
        rowComponent={Row}
        listRef={listRef}
        rowProps={{}}
        rowKey={(index: number) => index}
      />

      <style jsx>{`
        .virtual-list-wrapper {
          position: relative;
          width: 100%;
          overflow: auto;
          -webkit-overflow-scrolling: touch;
        }
        
        .virtual-list {
          -webkit-overflow-scrolling: touch;
        }
        
        .virtual-list-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
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