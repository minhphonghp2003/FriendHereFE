import { type Middleware } from "@reduxjs/toolkit";

export const loggerMiddleware: Middleware = (store) => (next) => (action) => {
  if (process.env.NODE_ENV === "development") {
    console.log("Dispatching:", action);
    const result = next(action);
    console.log("Next state:", store.getState());
    return result;
  }
  return next(action);
};
