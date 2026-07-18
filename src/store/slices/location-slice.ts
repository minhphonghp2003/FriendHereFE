import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LocationDto } from "@/lib/signalr/types";

interface LocationState {
  locations: LocationDto[];
  kicked: boolean;
}

const initialState: LocationState = {
  locations: [],
  kicked: false,
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
    resetLocation: () => initialState,
  },
});

export const { setLocations, addLocation, removeLocation, setKicked, resetLocation } = locationSlice.actions;
export const locationReducer = locationSlice.reducer;
