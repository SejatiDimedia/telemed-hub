import { apiClient } from "../../../lib/api-client";
import type { PatientProfile, UpdatePatientRequest } from "../types";

export const patientApi = {
  getMe: (): Promise<PatientProfile> => {
    return apiClient.get<PatientProfile>("/patients/me");
  },

  updateMe: (data: UpdatePatientRequest): Promise<PatientProfile> => {
    return apiClient.put<PatientProfile>("/patients/me", data);
  },
};
