import { apiClient } from "../../../lib/api-client";
import type { AdminStats, AdminUser, ListUsersParams, AdminAuditLog, ListAuditLogsParams } from "../types";
import type { DoctorProfile } from "../../doctor/types";

export const adminApi = {
  getStats: (): Promise<AdminStats> => {
    return apiClient.get<AdminStats>("/admin/stats");
  },

  listUsers: (params?: ListUsersParams): Promise<AdminUser[]> => {
    const query = new URLSearchParams();
    if (params?.role) query.set("role", params.role);
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    const qs = query.toString();
    return apiClient.get<AdminUser[]>(`/admin/users${qs ? `?${qs}` : ""}`);
  },

  getUser: (id: string): Promise<AdminUser> => {
    return apiClient.get<AdminUser>(`/admin/users/${id}`);
  },

  suspendUser: (id: string, status: "suspended" | "active", reason?: string): Promise<AdminUser> => {
    return apiClient.post<AdminUser>(`/admin/users/${id}/suspend`, { status, reason });
  },

  assignRole: (id: string, role: string): Promise<{ user_id: string; roles: string[] }> => {
    return apiClient.post<{ user_id: string; roles: string[] }>(`/admin/users/${id}/roles`, { role });
  },

  listAuditLogs: (params?: ListAuditLogsParams): Promise<AdminAuditLog[]> => {
    const query = new URLSearchParams();
    if (params?.actor_id) query.set("actor_id", params.actor_id);
    if (params?.action) query.set("action", params.action);
    if (params?.target_type) query.set("target_type", params.target_type);
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    const qs = query.toString();
    return apiClient.get<AdminAuditLog[]>(`/admin/audit-logs${qs ? `?${qs}` : ""}`);
  },

  listDoctors: (): Promise<DoctorProfile[]> => {
    return apiClient.get<DoctorProfile[]>(`/doctors?limit=100&_t=${Date.now()}`);
  },

  verifyDoctor: (doctorId: string): Promise<{ message: string }> => {
    return apiClient.post<{ message: string }>(`/doctors/${doctorId}/verify`, {});
  },
};
