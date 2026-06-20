import { httpClient } from "@/lib/axios";

export const logout = async (): Promise<void> => {
  await httpClient.post("/auth/logout");
};
