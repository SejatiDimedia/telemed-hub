import { apiClient } from "../../../lib/api-client";
import type { Prescription, CreatePrescriptionRequest } from "../types";

export const prescriptionApi = {
  create: (data: CreatePrescriptionRequest): Promise<Prescription> => {
    return apiClient.post<Prescription>("/prescriptions", data);
  },
};
