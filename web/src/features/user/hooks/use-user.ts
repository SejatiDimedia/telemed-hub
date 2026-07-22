import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "../api/user-api";

export const useUploadAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => userApi.uploadAvatar(file),
    onSuccess: () => {
      // Invalidate queries that might depend on the user's avatar
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      queryClient.invalidateQueries({ queryKey: ["doctors", "me"] });
      queryClient.invalidateQueries({ queryKey: ["patients", "profile"] });
    },
  });
};
