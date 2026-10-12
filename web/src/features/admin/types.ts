export interface AdminStats {
  total_users: number;
  total_patients: number;
  total_doctors: number;
  verified_doctors: number;
  pending_doctors: number;
  total_consultations: number;
  total_orders: number;
  total_audit_logs: number;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  status: "active" | "suspended" | "deactivated";
  is_verified: boolean;
  roles: string[];
  created_at: string;
}

export interface ListUsersParams {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminAuditLog {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  ip_address: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ListAuditLogsParams {
  actor_id?: string;
  action?: string;
  target_type?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export function formatAuditAction(action: string): string {
  const map: Record<string, string> = {
    "doctor.verified": "Verifikasi Dokter",
    "user.suspended": "Penangguhan Akun",
    "user.role_assigned": "Pembaruan Peran",
    "medical_record.read": "Akses Rekam Medis",
    "medical_record.created": "Penerbitan Rekam Medis",
    "appointment.created": "Janji Temu Baru",
    "appointment.cancelled": "Pembatalan Janji Temu",
  };
  return map[action] || action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatTargetType(targetType: string): string {
  const map: Record<string, string> = {
    doctor: "Profil Dokter",
    user: "Akun Pengguna",
    medical_record: "Rekam Medis",
    appointment: "Konsultasi",
  };
  return map[targetType] || targetType;
}

export function formatRoleLabel(role: string): string {
  const map: Record<string, string> = {
    patient: "Pasien",
    doctor: "Dokter",
    pharmacy_staff: "Staf Farmasi",
    admin: "Administrator",
  };
  return map[role] || role;
}
