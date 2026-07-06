import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createWalkIn } from "../api";
import type { WalkInInput } from "../types";

export const useCreateWalkIn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: WalkInInput) => createWalkIn(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};
