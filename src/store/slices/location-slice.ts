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
}

const initialState: LocationState = {
  locations: [],
  kicked: false,
  locationDenied: false,
  latitude: null,
  longitude: null,
  accuracy: null,
  speed: null,
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
    resetLocation: () => initialState,
  },
});

export const { setLocations, addLocation, removeLocation, setKicked, setLocationDenied, setCurrentPosition, resetLocation } = locationSlice.actions;
export const locationReducer = locationSlice.reducer;
