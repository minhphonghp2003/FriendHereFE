import { httpClient } from "@/lib/axios";

export const deleteUser = async (id: string): Promise<void> => {
  await httpClient.delete(`/users/${id}`);
};
