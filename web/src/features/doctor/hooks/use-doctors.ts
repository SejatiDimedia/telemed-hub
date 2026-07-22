import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doctorApi } from "../api/doctor-api";
import { useToastStore } from "../../../stores/toast-store";

export const doctorKeys = {
  all: ["doctors"] as const,
  lists: () => [...doctorKeys.all, "list"] as const,
  details: () => [...doctorKeys.all, "detail"] as const,
  detail: (id: string) => [...doctorKeys.details(), id] as const,
  me: () => [...doctorKeys.all, "me"] as const,
  availabilities: (id: string) => [...doctorKeys.detail(id), "availability"] as const,
};

export function useDoctors() {
  return useQuery({
    queryKey: doctorKeys.lists(),
    queryFn: doctorApi.list,
    staleTime: 0, // Bypass cache temporarily for development
  });
}

export function useDoctorProfile(id: string) {
  return useQuery({
    queryKey: doctorKeys.detail(id),
    queryFn: () => doctorApi.get(id),
    enabled: !!id,
  });
}

export function useDoctorAvailability(id: string) {
  return useQuery({
    queryKey: doctorKeys.availabilities(id),
    queryFn: () => doctorApi.getAvailability(id),
    enabled: !!id,
  });
}

export function useDoctorProfileMe() {
  return useQuery({
    queryKey: doctorKeys.me(),
    queryFn: doctorApi.getMe,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateAvailability() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: (data: { start_time: string; end_time: string }) =>
      doctorApi.createAvailability(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: doctorKeys.all });
      addToast({
        type: "success",
        title: "Jadwal Ditambahkan",
        message: "Slot ketersediaan berhasil didaftarkan.",
      });
    },
  });
}

export function useCreateAvailabilityBulk() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: (data: { slots: { start_time: string; end_time: string }[] }) =>
      doctorApi.createAvailabilityBulk(data),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: doctorKeys.all });
      
      const successCount = res.created?.length ?? 0;
      const failCount = res.errors?.length ?? 0;
      
      if (successCount > 0 && failCount === 0) {
        addToast({
          type: "success",
          title: "Jadwal Ditambahkan",
          message: `Berhasil menambahkan ${successCount} slot jadwal ketersediaan.`,
        });
      } else if (successCount > 0 && failCount > 0) {
        addToast({
          type: "warning",
          title: "Jadwal Ditambahkan Sebagian",
          message: `Berhasil mendaftarkan ${successCount} slot. ${failCount} slot dilewati karena bentrok/tidak valid.`,
        });
      } else if (failCount > 0) {
        addToast({
          type: "error",
          title: "Gagal Menambahkan Jadwal",
          message: `Semua ${failCount} slot jadwal bentrok dengan jadwal yang sudah ada.`,
        });
      }
    },
    onError: (error: any) => {
      addToast({
        type: "error",
        title: "Gagal Menambahkan Jadwal",
        message: error instanceof Error ? error.message : "Terjadi kesalahan.",
      });
    }
  });
}

export function useDeleteAvailability() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: (slotId: string) => doctorApi.deleteAvailability(slotId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: doctorKeys.all });
      addToast({
        type: "success",
        title: "Jadwal Dihapus",
        message: "Slot ketersediaan berhasil dihapus.",
      });
    },
  });
}

export function useUpdateDoctorProfile() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: (data: Partial<Parameters<typeof doctorApi.updateMe>[0]>) => doctorApi.updateMe(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: doctorKeys.me() });
      addToast({
        type: "success",
        title: "Profil Diperbarui",
        message: "Profil praktek medis Anda berhasil disimpan.",
      });
    },
    onError: (error: any) => {
      addToast({
        type: "error",
        title: "Gagal Memperbarui Profil",
        message: error instanceof Error ? error.message : "Terjadi kesalahan pada server.",
      });
    },
  });
}
