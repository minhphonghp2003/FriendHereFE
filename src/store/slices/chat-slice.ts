import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ConversationDto, MessageDto } from "@/types/chat";

interface ChatState {
  conversations: ConversationDto[];
  conversationsTotalCount: number;
  activeConversationId: number | null;
  messages: Record<number, MessageDto[]>;
  messageTotalCount: Record<number, number>;
}

const initialState: ChatState = {
  conversations: [],
  conversationsTotalCount: 0,
  activeConversationId: null,
  messages: {},
  messageTotalCount: {},
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setConversations: (state, action: PayloadAction<{ data: ConversationDto[]; totalCount: number }>) => {
      state.conversations = action.payload.data;
      state.conversationsTotalCount = action.payload.totalCount;
    },
    addConversations: (state, action: PayloadAction<{ data: ConversationDto[]; totalCount: number }>) => {
      const existingIds = new Set(state.conversations.map((c) => c.id));
      const newOnes = action.payload.data.filter((c) => !existingIds.has(c.id));
      state.conversations.push(...newOnes);
      state.conversationsTotalCount = action.payload.totalCount;
    },
    addConversation: (state, action: PayloadAction<ConversationDto>) => {
      const idx = state.conversations.findIndex((c) => c.id === action.payload.id);
      if (idx !== -1) {
        state.conversations[idx] = action.payload;
      } else {
        state.conversations.unshift(action.payload);
      }
    },
    updateConversationWithLastMessage: (state, action: PayloadAction<{ conversationId: number; message: MessageDto }>) => {
      const conv = state.conversations.find((c) => c.id === action.payload.conversationId);
      if (conv) {
        conv.lastMessage = action.payload.message;
        const idx = state.conversations.indexOf(conv);
        if (idx > 0) {
          state.conversations.splice(idx, 1);
          state.conversations.unshift(conv);
        }
        if (state.activeConversationId !== action.payload.conversationId) {
          conv.unreadCount = (conv.unreadCount ?? 0) + 1;
        }
      }
    },
    setActiveConversation: (state, action: PayloadAction<number | null>) => {
      state.activeConversationId = action.payload;
    },
    resetUnreadCount: (state, action: PayloadAction<number>) => {
      const conv = state.conversations.find((c) => c.id === action.payload);
      if (conv) {
        conv.unreadCount = 0;
      }
    },
    setMessages: (state, action: PayloadAction<{ conversationId: number; messages: MessageDto[]; totalCount: number }>) => {
      state.messages[action.payload.conversationId] = action.payload.messages;
      state.messageTotalCount[action.payload.conversationId] = action.payload.totalCount;
    },
    prependMessages: (state, action: PayloadAction<{ conversationId: number; messages: MessageDto[]; totalCount: number }>) => {
      const existing = state.messages[action.payload.conversationId] ?? [];
      const existingIds = new Set(existing.map((m) => m.id));
      const newOnes = action.payload.messages.filter((m) => !existingIds.has(m.id));
      state.messages[action.payload.conversationId] = [...newOnes, ...existing];
      state.messageTotalCount[action.payload.conversationId] = action.payload.totalCount;
    },
    appendMessage: (state, action: PayloadAction<{ conversationId: number; message: MessageDto }>) => {
      const { conversationId, message } = action.payload;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      state.messages[conversationId].push(message);
    },
    resetChat: () => initialState,
  },
});

export const {
  setConversations,
  addConversations,
  addConversation,
  updateConversationWithLastMessage,
  setActiveConversation,
  resetUnreadCount,
  setMessages,
  prependMessages,
  appendMessage,
  resetChat,
} = chatSlice.actions;
export const chatReducer = chatSlice.reducer;