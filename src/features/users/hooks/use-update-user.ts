import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCurrentUser } from "../api";
import type { UpdateUserInput } from "../types";

export const useUpdateCurrentUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateUserInput) => updateCurrentUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};
