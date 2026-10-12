package dto

type AuditLogResponse struct {
	ID         string         `json:"id"`
	ActorID    string         `json:"actor_id"`
	Action     string         `json:"action"`
	TargetType string         `json:"target_type"`
	TargetID   string         `json:"target_id"`
	IPAddress  string         `json:"ip_address"`
	UserAgent  *string        `json:"user_agent,omitempty"`
	Metadata   map[string]any `json:"metadata,omitempty"`
	CreatedAt  string         `json:"created_at"`
}

type ListAuditLogsFilter struct {
	ActorID    *string `json:"actor_id,omitempty"`
	Action     *string `json:"action,omitempty"`
	TargetType *string `json:"target_type,omitempty"`
	From       *string `json:"from,omitempty"`
	To         *string `json:"to,omitempty"`
	Page       int     `json:"page"`
	Limit      int     `json:"limit"`
}

type UserResponse struct {
	ID          string   `json:"id"`
	Email       string   `json:"email"`
	FullName    string   `json:"full_name"`
	PhoneNumber *string  `json:"phone_number,omitempty"`
	Status      string   `json:"status"` // "active", "suspended", "deactivated"
	IsVerified  bool     `json:"is_verified"`
	Roles       []string `json:"roles"`
	CreatedAt   string   `json:"created_at"`
}

type ListUsersFilter struct {
	Role   *string `json:"role,omitempty"`
	Status *string `json:"status,omitempty"`
	Search *string `json:"search,omitempty"`
	Page   int     `json:"page"`
	Limit  int     `json:"limit"`
}

type SuspendUserRequest struct {
	Status string `json:"status"` // "suspended" or "active"
	Reason string `json:"reason,omitempty"`
}

type UpdateUserRequest struct {
	Email       string  `json:"email"`
	FullName    string  `json:"full_name"`
	PhoneNumber *string `json:"phone_number,omitempty"`
}

type AssignRoleRequest struct {
	Role string `json:"role"` // "pharmacy_staff" or "admin"
}

type AssignRoleResponse struct {
	UserID string   `json:"user_id"`
	Roles  []string `json:"roles"`
}

type AdminStatsResponse struct {
	TotalUsers         int `json:"total_users"`
	TotalPatients      int `json:"total_patients"`
	TotalDoctors       int `json:"total_doctors"`
	VerifiedDoctors    int `json:"verified_doctors"`
	PendingDoctors     int `json:"pending_doctors"`
	TotalConsultations int `json:"total_consultations"`
	TotalOrders        int `json:"total_orders"`
	TotalAuditLogs     int `json:"total_audit_logs"`
}
