import { useQuery } from "@tanstack/react-query";
import { getUserById, getCurrentUser } from "../api";

export const useUser = (id: number) => {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => getUserById(id),
    enabled: !!id,
  });
};

export const useCurrentUser = () => {
  return useQuery({
    queryKey: ["users", "me"],
    queryFn: () => getCurrentUser(),
  });
};
