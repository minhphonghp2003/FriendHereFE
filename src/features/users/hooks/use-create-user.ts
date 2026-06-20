import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUser } from "../api";
import type { CreateUserInput } from "../types";

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};
