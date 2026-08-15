import { useEffect, useState } from "react";
import { appHub } from "@/lib/signalr/app-hub";

export interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isGroup: boolean;
  isOnline?: boolean;
  participants?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  isCurrentUser: boolean;
  isRead?: boolean;
}

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Subscribe to real-time chat updates via SignalR
    const unsubscribe = appHub.onReceiveMessage((message: any) => {
      const adaptedMessage = {
        id: message.id.toString(),
        conversationId: message.conversationId.toString(),
        senderId: message.senderId.toString(),
        senderName: message.senderName,
        senderAvatar: message.senderAvatarUrl,
        content: message.content,
        timestamp: message.createdTime,
        isCurrentUser: message.isMine,
        isRead: message.isRead
      };
      
      setMessages(prev => ({
        ...prev,
        [adaptedMessage.conversationId]: [...(prev[adaptedMessage.conversationId] || []), adaptedMessage]
      }));
      
      // Update conversation last message
      setConversations(prev => prev.map(conv => {
        if (conv.id === adaptedMessage.conversationId) {
          return {
            ...conv,
            lastMessage: adaptedMessage.content,
            lastMessageTime: adaptedMessage.timestamp
          };
        }
        return conv;
      }));
    });

    const unsubscribeTyping = appHub.onReceiveTyping((data: any) => {
      // Handle typing indicator
      console.log('User typing:', data);
    });

    const unsubscribeRead = appHub.onReceiveMessagesRead((data: any) => {
      setMessages(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(convId => {
          updated[convId] = updated[convId].map(msg => 
            msg.isCurrentUser ? { ...msg, isRead: true } : msg
          );
        });
        return updated;
      });
    });

    return () => {
      unsubscribe();
      unsubscribeTyping();
      unsubscribeRead();
    };
  }, []);

  const getConversations = async (): Promise<Conversation[]> => {
    try {
      setIsLoading(true);
      // Use existing chat service
      const response = await fetch('/api/chat/conversations');
      const data = await response.json();
      setConversations(data);
      return data;
    } catch (error) {
      console.error('Failed to get conversations:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const getMessages = async (conversationId: string): Promise<Message[]> => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`);
      const data = await response.json();
      setMessages(prev => ({ ...prev, [conversationId]: data }));
      return data;
    } catch (error) {
      console.error('Failed to get messages:', error);
      return [];
    }
  };

  const sendMessage = async (conversationId: string, content: string): Promise<Message> => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  const markAsRead = async (conversationId: string) => {
    try {
      await fetch(`/api/chat/conversations/${conversationId}/read`, {
        method: 'POST'
      });
      
      // Update local state
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      ));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const startTyping = (conversationId: string) => {
    appHub.sendTyping(parseInt(conversationId), true);
  };

  const stopTyping = (conversationId: string) => {
    appHub.sendTyping(parseInt(conversationId), false);
  };

  return {
    conversations,
    messages,
    isLoading,
    getConversations,
    getMessages,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping
  };
}