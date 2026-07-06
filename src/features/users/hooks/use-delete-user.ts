import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteWalkIn } from "../api";

export const useDeleteWalkIn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteWalkIn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};
