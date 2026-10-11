import { apiClient } from "../../../lib/api-client";
import type {
  Consultation,
  ConsultationRoom,
  ConsultationMessage,
  SendMessagePayload,
} from "../types";

export const consultationApi = {
  getRoom: (id: string): Promise<ConsultationRoom> => {
    return apiClient.get<ConsultationRoom>(`/consultations/${id}/room`);
  },

  getMessages: (id: string): Promise<ConsultationMessage[]> => {
    return apiClient.get<ConsultationMessage[]>(`/consultations/${id}/messages`);
  },

  sendMessage: (id: string, payload: SendMessagePayload): Promise<ConsultationMessage> => {
    return apiClient.post<ConsultationMessage>(`/consultations/${id}/messages`, payload);
  },

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

