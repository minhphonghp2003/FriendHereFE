import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUser } from "../api";
import type { UpdateUserInput } from "../types";

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) => updateUser(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};
