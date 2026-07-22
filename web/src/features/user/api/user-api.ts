import { apiClient } from "@/lib/api-client";

export const userApi = {
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await apiClient.post<{ profile_picture_url: string }>("/users/me/avatar", formData);
    return response;
  },
};
