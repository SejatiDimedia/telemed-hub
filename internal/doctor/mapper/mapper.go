package mapper

import (
	"time"

	"github.com/timurdianradhasejati/telemed_hub/internal/doctor/dto"
	"github.com/timurdianradhasejati/telemed_hub/internal/doctor/model"
)

// ToResponse maps a Doctor domain entity to a DoctorResponse DTO.
func ToResponse(doctor *model.Doctor) *dto.DoctorResponse {
	if doctor == nil {
		return nil
	}

	var specialtyResp *dto.SpecialtyResponse
	var specialtyIDStr *string

	if doctor.SpecialtyID != nil {
		idStr := doctor.SpecialtyID.String()
		specialtyIDStr = &idStr
	}

	if doctor.Specialty != nil {
		specialtyResp = &dto.SpecialtyResponse{
			ID:          doctor.Specialty.ID.String(),
			Name:        doctor.Specialty.Name,
			ImageIcon:   doctor.Specialty.ImageIcon,
			Description: doctor.Specialty.Description,
		}
	}

	return &dto.DoctorResponse{
		ID:                   doctor.ID.String(),
		UserID:               doctor.UserID.String(),
		Email:                doctor.Email,
		FullName:             doctor.FullName,
		ProfilePictureURL:    doctor.ProfilePictureURL,
		PhoneNumber:          doctor.PhoneNumber,
		SpecialtyID:          specialtyIDStr,
		Specialty:            specialtyResp,
		LicenseNumber:        doctor.LicenseNumber,
		IsCredentialVerified: doctor.IsCredentialVerified,
		ConsultationFee:      doctor.ConsultationFee,
		Rating:               doctor.Rating,
		TotalReviews:         doctor.TotalReviews,
	}
}

// ToReviewResponse maps a DoctorReviewWithPatient model to a ReviewResponse DTO.
func ToReviewResponse(r *model.DoctorReviewWithPatient) *dto.ReviewResponse {
	if r == nil {
		return nil
	}
	return &dto.ReviewResponse{
		ID:             r.ID.String(),
		ConsultationID: r.ConsultationID.String(),
		DoctorID:       r.DoctorID.String(),
		PatientID:      r.PatientID.String(),
		PatientName:    r.PatientName,
		Rating:         r.Rating,
		Comment:        r.Comment,
		CreatedAt:      r.CreatedAt,
	}
}

// ToReviewResponseList maps a list of DoctorReviewWithPatient to ReviewResponse DTOs.
func ToReviewResponseList(reviews []*model.DoctorReviewWithPatient) []dto.ReviewResponse {
	resp := make([]dto.ReviewResponse, len(reviews))
	for i, r := range reviews {
		resp[i] = *ToReviewResponse(r)
	}
	return resp
}

// ToReviewSummaryResponse maps ReviewSummary model to ReviewSummaryResponse DTO.
func ToReviewSummaryResponse(s *model.ReviewSummary) dto.ReviewSummaryResponse {
	if s == nil {
		return dto.ReviewSummaryResponse{
			RatingCounts: make(map[int]int),
		}
	}
	return dto.ReviewSummaryResponse{
		AverageRating: s.AverageRating,
		TotalReviews:  s.TotalReviews,
		RatingCounts:  s.RatingCounts,
	}
}

// ToResponseList maps a list of Doctor entities to response DTOs.
func ToResponseList(doctors []*model.Doctor) []*dto.DoctorResponse {
	resp := make([]*dto.DoctorResponse, len(doctors))
	for i, d := range doctors {
		resp[i] = ToResponse(d)
	}
	return resp
}

// ToAvailabilityResponse maps an Availability model to AvailabilityResponse DTO.
func ToAvailabilityResponse(avail *model.Availability) *dto.AvailabilityResponse {
	if avail == nil {
		return nil
	}

	return &dto.AvailabilityResponse{
		ID:        avail.ID.String(),
		DoctorID:  avail.DoctorID.String(),
		StartTime: avail.StartTime.Format(time.RFC3339),
		EndTime:   avail.EndTime.Format(time.RFC3339),
		IsBooked:  avail.IsBooked,
	}
}

// ToAvailabilityResponseList maps a slice of Availability models to a slice of AvailabilityResponse DTOs.
func ToAvailabilityResponseList(avails []*model.Availability) []*dto.AvailabilityResponse {
	resp := make([]*dto.AvailabilityResponse, len(avails))
	for i, a := range avails {
		resp[i] = ToAvailabilityResponse(a)
	}
	return resp
}
