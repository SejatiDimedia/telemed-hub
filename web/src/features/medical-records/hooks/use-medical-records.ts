import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { medicalRecordsApi } from "../api/medical-records-api";

export const medicalRecordKeys = {
  all: ["medical-records"] as const,
  lists: () => [...medicalRecordKeys.all, "list"] as const,
  list: (recordType?: string, patientId?: string) => [...medicalRecordKeys.lists(), { recordType, patientId }] as const,
  details: () => [...medicalRecordKeys.all, "detail"] as const,
  detail: (id: string) => [...medicalRecordKeys.details(), id] as const,
};

export function useMedicalRecords(params?: { recordType?: string; patientId?: string }) {
  return useQuery({
    queryKey: medicalRecordKeys.list(params?.recordType, params?.patientId),
    queryFn: () => medicalRecordsApi.list({ record_type: params?.recordType, patient_id: params?.patientId }),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

export function useMedicalRecordDetails(id: string) {
  return useQuery({
    queryKey: medicalRecordKeys.detail(id),
    queryFn: () => medicalRecordsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateMedicalRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof medicalRecordsApi.create>[0]) =>
      medicalRecordsApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: medicalRecordKeys.all });
    },
  });
}
