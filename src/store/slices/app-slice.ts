import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface AppState {
  sidebarOpen: boolean;
  locale: string;
  notifications: Array<{ id: string; message: string; type: "info" | "success" | "error" }>;
  currentVersion: string;
  latestVersion: string | null;
}

const initialState: AppState = {
  sidebarOpen: false,
  locale: "en",
  notifications: [],
  currentVersion: "0.1.0",
  latestVersion: null,
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
    addNotification: (
      state,
      action: PayloadAction<{ id: string; message: string; type: "info" | "success" | "error" }>,
    ) => {
      state.notifications.push(action.payload);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
    setCurrentVersion: (state, action: PayloadAction<string>) => {
      state.currentVersion = action.payload;
    },
    setLatestVersion: (state, action: PayloadAction<string | null>) => {
      state.latestVersion = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setLocale,
  addNotification,
  removeNotification,
  setCurrentVersion,
  setLatestVersion,
} = appSlice.actions;
export const appReducer = appSlice.reducer;
