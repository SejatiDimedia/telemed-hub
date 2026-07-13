import { apiClient } from "../../../lib/api-client";
import type { DoctorProfile, Availability } from "../types";

export const doctorApi = {
  list: (): Promise<DoctorProfile[]> => {
    return apiClient.get<DoctorProfile[]>("/doctors");
  },

  get: (id: string): Promise<DoctorProfile> => {
    return apiClient.get<DoctorProfile>(`/doctors/${id}`);
  },

  getMe: (): Promise<DoctorProfile> => {
    return apiClient.get<DoctorProfile>("/doctors/me");
  },

  getAvailability: (id: string): Promise<Availability[]> => {
    return apiClient.get<Availability[]>(`/doctors/${id}/availability`);
  },
};
