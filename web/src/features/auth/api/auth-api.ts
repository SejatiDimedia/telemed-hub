import { apiClient } from "../../../lib/api-client";
import type { LoginRequest, RegisterRequest } from "../types";

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface RegisterResponse {
  id: string;
  email: string;
  role: string;
}

export interface UserResponse {
  id: string;
  email: string;
  roles: string[];
  full_name: string;
}

export const authApi = {
  login: (data: LoginRequest): Promise<AuthResponse> => {
    return apiClient.post<AuthResponse>("/auth/login", data);
  },

  register: (data: RegisterRequest): Promise<RegisterResponse> => {
    return apiClient.post<RegisterResponse>("/auth/register", data);
  },

  getMe: (): Promise<UserResponse> => {
    return apiClient.get<UserResponse>("/auth/me");
  },

  logout: (): Promise<void> => {
    return apiClient.post<void>("/auth/logout");
  },
};
