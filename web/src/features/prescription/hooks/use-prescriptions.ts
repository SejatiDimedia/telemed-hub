import { useMutation, useQueryClient } from "@tanstack/react-query";
import { prescriptionApi } from "../api/prescription-api";
import { useToastStore } from "../../../stores/toast-store";
import type { CreatePrescriptionRequest } from "../types";

export const prescriptionKeys = {
  all: ["prescriptions"] as const,
};

export function useCreatePrescription() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: (data: CreatePrescriptionRequest) => prescriptionApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: prescriptionKeys.all });
      addToast({
        type: "success",
        title: "Resep Digital Diterbitkan",
        message: "Resep obat berhasil dikaitkan ke catatan sesi medis.",
      });
    },
  });
}
