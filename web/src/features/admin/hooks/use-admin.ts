import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../api/admin-api";
import type { ListUsersParams, ListAuditLogsParams } from "../types";
import { useToastStore } from "../../../stores/toast-store";

export const adminKeys = {
  all: ["admin"] as const,
  stats: () => [...adminKeys.all, "stats"] as const,
  users: (params?: ListUsersParams) => [...adminKeys.all, "users", params] as const,
  user: (id: string) => [...adminKeys.all, "user", id] as const,
  auditLogs: (params?: ListAuditLogsParams) => [...adminKeys.all, "audit-logs", params] as const,
  doctors: () => [...adminKeys.all, "doctors"] as const,
};

export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: adminApi.getStats,
  });
}

export function useAdminUsers(params?: ListUsersParams) {
  return useQuery({
    queryKey: adminKeys.users(params),
    queryFn: () => adminApi.listUsers(params),
  });
}

export function useAdminAuditLogs(params?: ListAuditLogsParams) {
  return useQuery({
    queryKey: adminKeys.auditLogs(params),
    queryFn: () => adminApi.listAuditLogs(params),
  });
}

export function useAdminDoctors() {
  return useQuery({
    queryKey: adminKeys.doctors(),
    queryFn: adminApi.listDoctors,
  });
}

export function useVerifyDoctorMutation() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  return useMutation({
    mutationFn: (doctorId: string) => adminApi.verifyDoctor(doctorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.doctors() });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      addToast({
        title: "Dokter Berhasil Diverifikasi",
        message: "Status kredensial dokter telah diaktifkan dan sekarang tersedia di pencarian publik.",
        type: "success",
      });
    },
    onError: (err: any) => {
      addToast({
        title: "Gagal Memverifikasi Dokter",
        message: err?.message || "Terjadi kesalahan saat memverifikasi kredensial dokter.",
        type: "error",
      });
    },
  });
}

export function useSuspendUserMutation() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  return useMutation({
    mutationFn: ({ userId, status, reason }: { userId: string; status: "suspended" | "active"; reason?: string }) =>
      adminApi.suspendUser(userId, status, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
      const statusLabel = data.status === "suspended" ? "Ditangguhkan" : "Aktif";
      addToast({
        title: data.status === "suspended" ? "Akun Ditangguhkan" : "Akun Diaktifkan Kembali",
        message: `Status pengguna ${data.full_name} (${data.email}) berhasil diperbarui menjadi ${statusLabel}.`,
        type: "success",
      });
    },
    onError: (err: any) => {
      addToast({
        title: "Gagal Mengubah Status Akun",
        message: err?.message || "Terjadi kesalahan saat memperbarui status pengguna.",
        type: "error",
      });
    },
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: { email: string; full_name: string; phone_number?: string } }) =>
      adminApi.updateUser(userId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.doctors() });
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      addToast({
        title: "Data Pengguna Diperbarui",
        message: `Informasi akun ${data.full_name} (${data.email}) berhasil disimpan.`,
        type: "success",
      });
    },
    onError: (err: any) => {
      addToast({
        title: "Gagal Memperbarui Pengguna",
        message: err?.message || "Terjadi kesalahan saat memperbarui akun pengguna.",
        type: "error",
      });
    },
  });
}

export function useAssignRoleMutation() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => adminApi.assignRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
      addToast({
        title: "Peran Pengguna Ditambahkan",
        message: "Hak akses pengguna telah diperbarui secara resmi.",
        type: "success",
      });
    },
    onError: (err: any) => {
      addToast({
        title: "Gagal Menetapkan Peran",
        message: err?.message || "Terjadi kesalahan saat menambahkan peran pengguna.",
        type: "error",
      });
    },
  });
}
