import { useMutation, useQueryClient } from "@tanstack/react-query";
import { consultationApi } from "../api/consultation-api";
import { useToastStore } from "../../../stores/toast-store";
import { appointmentKeys } from "../../appointment/hooks/use-appointments";

export const consultationKeys = {
  all: ["consultations"] as const,
};

export function useStartConsultation() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: (id: string) => consultationApi.start(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      addToast({
        type: "success",
        title: "Konsultasi Dimulai",
        message: "Status konsultasi berhasil diubah ke Sedang Berjalan.",
      });
    },
  });
}

export function useUpdateConsultationNotes() {
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      consultationApi.updateNotes(id, notes),
  });
}

export function useCompleteConsultation() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: (id: string) => consultationApi.complete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      addToast({
        type: "success",
        title: "Konsultasi Selesai",
        message: "Sesi konsultasi medis telah diselesaikan dengan sukses.",
      });
    },
  });
}
