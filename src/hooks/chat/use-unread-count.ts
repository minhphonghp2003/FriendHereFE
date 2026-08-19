"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";
import { setTotalUnreadCount } from "@/store/slices/chat-slice";
import { appHub } from "@/lib/signalr/app-hub";

/**
 * useUnreadCount - Manages unread count initialization and updates from SignalR
 * 
 * Features:
 * - Automatically receives unread count when connected to SignalR
 * - Handles reconnection scenarios
 * - Error handling and validation
 * - Updates Redux store with safe values
 */
export function useUnreadCount() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Subscribe to unread count updates from SignalR
    const unsubscribe = appHub.onReceiveUnreadCount((unreadCount: number) => {
      // Validation and error handling is done in the SignalR hub
      // Update Redux store with the validated count
      dispatch(setTotalUnreadCount(unreadCount));
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [dispatch]);
}