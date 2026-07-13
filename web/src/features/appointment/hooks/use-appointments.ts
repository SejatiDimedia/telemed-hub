import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appointmentApi } from "../api/appointment-api";
import type { CreateAppointmentRequest } from "../types";
import { useToastStore } from "../../../stores/toast-store";

export const appointmentKeys = {
  all: ["appointments"] as const,
  lists: () => [...appointmentKeys.all, "list"] as const,
  list: (status?: string) => [...appointmentKeys.lists(), { status }] as const,
  details: () => [...appointmentKeys.all, "detail"] as const,
  detail: (id: string) => [...appointmentKeys.details(), id] as const,
};

export function useAppointments(status?: string) {
  return useQuery({
    queryKey: appointmentKeys.list(status),
    queryFn: () => appointmentApi.list({ status }),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useAppointmentDetails(id: string) {
  return useQuery({
    queryKey: appointmentKeys.detail(id),
    queryFn: () => appointmentApi.get(id),
    enabled: !!id,
  });
}

export function useBookAppointment() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: (data: CreateAppointmentRequest) => appointmentApi.book(data),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      addToast({
        type: "success",
        title: "Janji Temu Berhasil",
        message: `Janji temu telah dijadwalkan pada ${new Date(data.scheduled_at).toLocaleString()}`,
      });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      appointmentApi.cancel(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      addToast({
        type: "success",
        title: "Pembatalan Berhasil",
        message: "Janji temu telah dibatalkan.",
      });
    },
  });
}
