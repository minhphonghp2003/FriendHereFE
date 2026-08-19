"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";
import { setTotalUnreadCount } from "@/store/slices/chat-slice";
import { appHub } from "@/lib/signalr/app-hub";
import { useAuth } from "@/providers/auth-provider";

/**
 * UnreadCountProvider - Manages unread count initialization and SignalR updates
 * 
 * This provider:
 * - Initializes unread count when user connects to SignalR
 * - Handles reconnection scenarios
 * - Validates incoming data
 * - Updates Redux store with safe values
 */
export function UnreadCountProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      // Reset unread count when logged out
      dispatch(setTotalUnreadCount(0));
      return;
    }

    let mounted = true;

    // Function to initialize unread count from SignalR
    const initializeUnreadCount = async () => {
      try {
        // Wait for connection to be ready
        await appHub.getConnection()?.start();
        
        // Request unread count from server
        // Note: This assumes the server sends ReceiveUnreadCount automatically on connection
        // If not, you might need to invoke a server method like:
        // await appHub.connection?.invoke("GetUnreadCount");
        
        console.log('[UnreadCount] Waiting for server to send unread count...');
      } catch (error) {
        console.error('[UnreadCount] Failed to initialize unread count:', error);
        if (mounted) {
          dispatch(setTotalUnreadCount(0));
        }
      }
    };

    // Subscribe to unread count updates from SignalR
    const unsubscribe = appHub.onReceiveUnreadCount((unreadCount: number) => {
      if (!mounted) return;
      
      console.log('[UnreadCount] Received unread count:', unreadCount);
      
      // Validation is done in SignalR hub, but double-check here
      if (typeof unreadCount === 'number' && !isNaN(unreadCount)) {
        const safeCount = Math.max(0, unreadCount);
        dispatch(setTotalUnreadCount(safeCount));
      } else {
        console.error('[UnreadCount] Invalid unread count received:', unreadCount);
        dispatch(setTotalUnreadCount(0));
      }
    });

    // Initialize when component mounts and user is authenticated
    initializeUnreadCount();

    // Cleanup
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [isAuthenticated, dispatch]);

  return <>{children}</>;
}