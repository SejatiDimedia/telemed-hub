package dto

// CreateAvailabilityRequest holds payload details for adding new availability slot.
type CreateAvailabilityRequest struct {
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
}

// CreateAvailabilityBulkRequest holds the payload to bulk add multiple ketersediaan slots.
type CreateAvailabilityBulkRequest struct {
	Slots []CreateAvailabilityRequest `json:"slots"`
}

// CreateAvailabilityBulkResponse details which slots succeeded and which had errors.
type CreateAvailabilityBulkResponse struct {
	Created []*AvailabilityResponse `json:"created"`
	Errors  []string                `json:"errors"`
}

// AvailabilityResponse represents a single formatted availability slot.
type AvailabilityResponse struct {
	ID        string `json:"id"`
	DoctorID  string `json:"doctor_id"`
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
	IsBooked  bool   `json:"is_booked"`
}
