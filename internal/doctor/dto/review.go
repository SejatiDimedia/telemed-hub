package dto

import "time"

// CreateReviewRequest payload for submitting a doctor review.
type CreateReviewRequest struct {
	Rating  int     `json:"rating"`
	Comment *string `json:"comment,omitempty"`
}

// ReviewResponse API representation of a review.
type ReviewResponse struct {
	ID             string    `json:"id"`
	ConsultationID string    `json:"consultation_id"`
	DoctorID       string    `json:"doctor_id"`
	PatientID      string    `json:"patient_id"`
	PatientName    string    `json:"patient_name"`
	Rating         int       `json:"rating"`
	Comment        *string   `json:"comment,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

// ReviewSummaryResponse contains aggregated rating statistics for a doctor.
type ReviewSummaryResponse struct {
	AverageRating float64     `json:"average_rating"`
	TotalReviews  int         `json:"total_reviews"`
	RatingCounts  map[int]int `json:"rating_counts"`
}

// DoctorReviewsResponse represents the paginated response containing doctor reviews and summary.
type DoctorReviewsResponse struct {
	Summary ReviewSummaryResponse `json:"summary"`
	Reviews []ReviewResponse      `json:"reviews"`
}
