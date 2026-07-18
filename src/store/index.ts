import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { authReducer } from "./slices/auth-slice";
import { appReducer } from "./slices/app-slice";
import { locationReducer } from "./slices/location-slice";

const rootReducer = combineReducers({
  auth: authReducer,
  app: appReducer,
  location: locationReducer,
});

export const makeStore = (preloadedState?: Partial<RootState>) => {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }),
  });
  return store;
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = AppStore["dispatch"];
