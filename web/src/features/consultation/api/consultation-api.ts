import { apiClient } from "../../../lib/api-client";
import type { Consultation } from "../types";

export const consultationApi = {
  start: (id: string): Promise<Consultation> => {
    return apiClient.post<Consultation>(`/consultations/${id}/start`, {});
  },

  updateNotes: (id: string, notes: string): Promise<Consultation> => {
    return apiClient.put<Consultation>(`/consultations/${id}/notes`, { notes });
  },

  complete: (id: string): Promise<Consultation> => {
    return apiClient.post<Consultation>(`/consultations/${id}/complete`, {});
  },
};
