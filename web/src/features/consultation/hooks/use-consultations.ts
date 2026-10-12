import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { consultationApi } from "../api/consultation-api";
import { useToastStore } from "../../../stores/toast-store";
import { appointmentKeys } from "../../appointment/hooks/use-appointments";
import { doctorKeys } from "../../doctor/hooks/use-doctors";
import type {
  SendMessagePayload,
  ConsultationMessage,
  ConsultationRoom,
  CreateReviewPayload,
  ConsultationReview,
} from "../types";

export const consultationKeys = {
  all: ["consultations"] as const,
  room: (id: string) => ["consultations", "room", id] as const,
  messages: (id: string) => ["consultations", "messages", id] as const,
  review: (id: string) => ["consultations", "review", id] as const,
};

export function useConsultationRoom(id: string) {
  return useQuery<ConsultationRoom>({
    queryKey: consultationKeys.room(id),
    queryFn: () => consultationApi.getRoom(id),
    enabled: Boolean(id),
    refetchInterval: false,
  });
}

export function useConsultationMessages(id: string) {
  return useQuery<ConsultationMessage[]>({
    queryKey: consultationKeys.messages(id),
    queryFn: () => consultationApi.getMessages(id),
    enabled: Boolean(id),
  });
}

export function useSendConsultationMessage(consultationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SendMessagePayload) =>
      consultationApi.sendMessage(consultationId, payload),
    onSuccess: (newMessage) => {
      queryClient.setQueryData<ConsultationMessage[]>(
        consultationKeys.messages(consultationId),
        (old) => (old ? [...old, newMessage] : [newMessage])
      );
      void queryClient.invalidateQueries({
        queryKey: consultationKeys.room(consultationId),
      });
    },
  });
}


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

export function useConsultationReview(consultationId: string) {
  return useQuery<ConsultationReview | null>({
    queryKey: consultationKeys.review(consultationId),
    queryFn: async () => {
      try {
        return await consultationApi.getReview(consultationId);
      } catch (err: any) {
        if (
          err?.status === 404 ||
          err?.code === "NOT_FOUND" ||
          (typeof err?.message === "string" && err.message.toLowerCase().includes("not found"))
        ) {
          return null;
        }
        throw err;
      }
    },
    enabled: Boolean(consultationId),
    retry: false,
  });
}

export function useCreateConsultationReview(consultationId: string) {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: (payload: CreateReviewPayload) =>
      consultationApi.createReview(consultationId, payload),
    onSuccess: (review) => {
      queryClient.setQueryData(consultationKeys.review(consultationId), review);
      void queryClient.invalidateQueries({ queryKey: doctorKeys.all });
      addToast({
        type: "success",
        title: "Ulasan Terkirim",
        message: "Terima kasih atas penilaian dan ulasan yang Anda berikan untuk dokter.",
      });
    },
  });
}
