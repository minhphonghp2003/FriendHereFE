import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  client: {
    NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:5001/api"),
    NEXT_PUBLIC_SIGNALR_URL: z.string().default("http://localhost:5001/Location"),
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().default(""),
    NEXT_PUBLIC_APP_NAME: z.string().default("FriendHereFE"),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SIGNALR_URL: process.env.NEXT_PUBLIC_SIGNALR_URL,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },
});
