import { apiClient } from "../../../lib/api-client";
import type { Prescription, CreatePrescriptionRequest } from "../types";

export const prescriptionApi = {
  create: (data: CreatePrescriptionRequest): Promise<Prescription> => {
    return apiClient.post<Prescription>("/prescriptions", data);
  },

  getByID: (id: string): Promise<Prescription> => {
    return apiClient.get<Prescription>(`/prescriptions/${id}`);
  },

  list: (): Promise<Prescription[]> => {
    return apiClient.get<Prescription[]>("/prescriptions");
  },
};
