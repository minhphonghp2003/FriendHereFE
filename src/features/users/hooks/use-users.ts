import { useQuery } from "@tanstack/react-query";
import { getUsers } from "../api";
import type { PaginationParams } from "@/types/api";

export const useUsers = (params?: PaginationParams) => {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => getUsers(params),
  });
};

export const useUser = (id: string) => {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => import("../api").then((m) => m.getUserById(id)),
    enabled: !!id,
  });
};
