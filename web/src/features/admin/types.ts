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
