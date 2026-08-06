import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LocationDto } from "@/lib/signalr/types";

interface LocationState {
  locations: LocationDto[];
  kicked: boolean;
  locationDenied: boolean;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  speed: number | null;
  movingUserIds: number[];
  visibility: number;
  battery: number | null;
}

const initialState: LocationState = {
  locations: [],
  kicked: false,
  locationDenied: false,
  latitude: null,
  longitude: null,
  accuracy: null,
  speed: null,
  movingUserIds: [],
  visibility: 4,
  battery: null,
};

const locationSlice = createSlice({
  name: "location",
  initialState,
  reducers: {
    setLocations: (state, action: PayloadAction<LocationDto[]>) => {
      const serverIds = new Set(action.payload.map((l) => l.userId));
      const extras = state.locations.filter((l) => !serverIds.has(l.userId));
      state.locations = [...action.payload, ...extras];
    },
    addLocation: (state, action: PayloadAction<LocationDto>) => {
      const exists = state.locations.some((l) => l.userId === action.payload.userId);
      if (!exists) {
        state.locations.push(action.payload);
      }
    },
    removeLocation: (state, action: PayloadAction<number>) => {
      state.locations = state.locations.filter((l) => l.userId !== action.payload);
    },
    setKicked: (state, action: PayloadAction<boolean>) => {
      state.kicked = action.payload;
    },
    setLocationDenied: (state) => {
      state.locationDenied = true;
    },
    setCurrentPosition: (state, action: PayloadAction<{ latitude: number; longitude: number; accuracy?: number; speed?: number }>) => {
      state.locationDenied = false;
      state.latitude = action.payload.latitude;
      state.longitude = action.payload.longitude;
      if (action.payload.accuracy !== undefined) state.accuracy = action.payload.accuracy;
      if (action.payload.speed !== undefined) state.speed = action.payload.speed;
    },
    updateOtherLocation: (state, action: PayloadAction<LocationDto>) => {
      const idx = state.locations.findIndex((l) => l.userId === action.payload.userId);
      if (idx !== -1) {
        state.locations[idx] = action.payload;
      }
    },
    updateLocationVisibility: (state, action: PayloadAction<LocationDto>) => {
      const payload = action.payload;
      if (payload.visibility === 0) {
        state.locations = state.locations.filter((l) => l.userId !== payload.userId);
        return;
      }
      const idx = state.locations.findIndex((l) => l.userId === payload.userId);
      if (idx !== -1) {
        state.locations[idx] = { ...state.locations[idx], ...payload };
      } else {
        state.locations.push(payload);
      }
    },
    updateLocationBattery: (state, action: PayloadAction<LocationDto>) => {
      const payload = action.payload;
      const idx = state.locations.findIndex((l) => l.userId === payload.userId);
      if (idx !== -1) {
        state.locations[idx] = {
          ...state.locations[idx],
          battery: payload.battery,
          updatedAt: payload.updatedAt,
        };
      }
    },
    setMyVisibility: (state, action: PayloadAction<number>) => {
      state.visibility = action.payload;
    },
    setMyBattery: (state, action: PayloadAction<number>) => {
      state.battery = action.payload;
    },
    setMovingUser: (state, action: PayloadAction<number>) => {
      if (!state.movingUserIds.includes(action.payload)) {
        state.movingUserIds.push(action.payload);
      }
    },
    clearMovingUser: (state, action: PayloadAction<number>) => {
      state.movingUserIds = state.movingUserIds.filter((id) => id !== action.payload);
    },
    resetLocation: () => initialState,
  },
});

export const {
  setLocations,
  addLocation,
  removeLocation,
  setKicked,
  setLocationDenied,
  setCurrentPosition,
  updateOtherLocation,
  updateLocationVisibility,
  updateLocationBattery,
  setMyVisibility,
  setMyBattery,
  setMovingUser,
  clearMovingUser,
  resetLocation,
} = locationSlice.actions;
export const locationReducer = locationSlice.reducer;
