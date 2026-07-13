import { apiClient } from "../../../lib/api-client";
import type {
  Appointment,
  CreateAppointmentRequest,
  CancelAppointmentRequest,
} from "../types";

export const appointmentApi = {
  list: (params?: { status?: string }): Promise<Appointment[]> => {
    const searchParams = new URLSearchParams();
    if (params?.status) {
      searchParams.append("status", params.status);
    }
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return apiClient.get<Appointment[]>(`/appointments${query}`);
  },

  get: (id: string): Promise<Appointment> => {
    return apiClient.get<Appointment>(`/appointments/${id}`);
  },

  book: (data: CreateAppointmentRequest): Promise<Appointment> => {
    return apiClient.post<Appointment>("/appointments", data);
  },

  cancel: (id: string, reason: string): Promise<void> => {
    const body: CancelAppointmentRequest = { cancel_reason: reason };
    return apiClient.post<void>(`/appointments/${id}/cancel`, body);
  },
};
