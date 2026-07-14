import { apiClient } from "../../../lib/api-client";
import type { MedicalRecord } from "../types";

export const medicalRecordsApi = {
  list: (params?: { record_type?: string; patient_id?: string }): Promise<MedicalRecord[]> => {
    const searchParams = new URLSearchParams();
    if (params?.record_type) {
      searchParams.append("record_type", params.record_type);
    }
    if (params?.patient_id) {
      searchParams.append("patient_id", params.patient_id);
    }
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return apiClient.get<MedicalRecord[]>(`/medical-records${query}`);
  },

  get: (id: string): Promise<MedicalRecord> => {
    return apiClient.get<MedicalRecord>(`/medical-records/${id}`);
  },

  create: (data: {
    patient_id: string;
    consultation_id?: string;
    record_type: string;
    content: string;
  }): Promise<MedicalRecord> => {
    return apiClient.post<MedicalRecord>("/medical-records", data);
  },
};
