import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface AppState {
  sidebarOpen: boolean;
  locale: string;
  notifications: Array<{ id: string; message: string; type: "info" | "success" | "error" }>;
}

const initialState: AppState = {
  sidebarOpen: false,
  locale: "en",
  notifications: [],
};

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setLocale: (state, action: PayloadAction<string>) => {
      state.locale = action.payload;
    },
    addNotification: (state, action: PayloadAction<{ id: string; message: string; type: "info" | "success" | "error" }>) => {
      state.notifications.push(action.payload);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
  },
});

export const { toggleSidebar, setLocale, addNotification, removeNotification } = appSlice.actions;
export const appReducer = appSlice.reducer;
