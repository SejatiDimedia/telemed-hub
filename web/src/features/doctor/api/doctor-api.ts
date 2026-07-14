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

  updateMe: (data: Partial<DoctorProfile>): Promise<DoctorProfile> => {
    return apiClient.put<DoctorProfile>("/doctors/me", data);
  },

  getAvailability: (id: string): Promise<Availability[]> => {
    return apiClient.get<Availability[]>(`/doctors/${id}/availability`);
  },

  createAvailability: (data: { start_time: string; end_time: string }): Promise<Availability> => {
    return apiClient.post<Availability>("/doctors/me/availability", data);
  },
  
  createAvailabilityBulk: (data: { slots: { start_time: string; end_time: string }[] }): Promise<{ created: Availability[]; errors: string[] }> => {
    return apiClient.post<{ created: Availability[]; errors: string[] }>("/doctors/me/availability/bulk", data);
  },

  deleteAvailability: (slotId: string): Promise<void> => {
    return apiClient.delete<void>(`/doctors/me/availability/${slotId}`);
  },
};
