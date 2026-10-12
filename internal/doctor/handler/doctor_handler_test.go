package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/timurdianradhasejati/telemed_hub/internal/config"
	"github.com/timurdianradhasejati/telemed_hub/internal/doctor/dto"
	"github.com/timurdianradhasejati/telemed_hub/pkg/logger"
	"github.com/timurdianradhasejati/telemed_hub/pkg/middleware"
)

type MockDoctorService struct {
	mock.Mock
}

func (m *MockDoctorService) GetProfileByUserID(ctx context.Context, userID uuid.UUID) (*dto.DoctorResponse, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.DoctorResponse), args.Error(1)
}

func (m *MockDoctorService) GetProfileByID(ctx context.Context, id uuid.UUID) (*dto.DoctorResponse, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.DoctorResponse), args.Error(1)
}

func (m *MockDoctorService) UpdateProfile(ctx context.Context, userID uuid.UUID, req dto.UpdateDoctorRequest) (*dto.DoctorResponse, error) {
	args := m.Called(ctx, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.DoctorResponse), args.Error(1)
}

func (m *MockDoctorService) VerifyDoctor(ctx context.Context, adminUserID uuid.UUID, doctorID uuid.UUID, ipAddress string, userAgent string) error {
	args := m.Called(ctx, adminUserID, doctorID, ipAddress, userAgent)
	return args.Error(0)
}

func (m *MockDoctorService) ListDoctors(ctx context.Context, specialty *string, onlyVerified bool, sortBy string, order string, page int, limit int) ([]*dto.DoctorResponse, int, error) {
	args := m.Called(ctx, specialty, onlyVerified, sortBy, order, page, limit)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*dto.DoctorResponse), args.Int(1), args.Error(2)
}

func (m *MockDoctorService) AddAvailability(ctx context.Context, doctorUserID uuid.UUID, req dto.CreateAvailabilityRequest) (*dto.AvailabilityResponse, error) {
	args := m.Called(ctx, doctorUserID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.AvailabilityResponse), args.Error(1)
}

func (m *MockDoctorService) AddAvailabilityBulk(ctx context.Context, doctorUserID uuid.UUID, req dto.CreateAvailabilityBulkRequest) (*dto.CreateAvailabilityBulkResponse, error) {
	args := m.Called(ctx, doctorUserID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.CreateAvailabilityBulkResponse), args.Error(1)
}

func (m *MockDoctorService) RemoveAvailability(ctx context.Context, doctorUserID uuid.UUID, slotID uuid.UUID) error {
	args := m.Called(ctx, doctorUserID, slotID)
	return args.Error(0)
}

func (m *MockDoctorService) GetAvailability(ctx context.Context, doctorID uuid.UUID, startTimeStr, endTimeStr string, isBooked *bool) ([]*dto.AvailabilityResponse, error) {
	args := m.Called(ctx, doctorID, startTimeStr, endTimeStr, isBooked)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*dto.AvailabilityResponse), args.Error(1)
}

func (m *MockDoctorService) InvalidateAvailabilityCache(ctx context.Context, doctorID uuid.UUID) error {
	args := m.Called(ctx, doctorID)
	return args.Error(0)
}

func (m *MockDoctorService) CreateReview(ctx context.Context, consultationID, doctorID, patientID, creatorUserID uuid.UUID, patientName string, req dto.CreateReviewRequest) (*dto.ReviewResponse, error) {
	args := m.Called(ctx, consultationID, doctorID, patientID, creatorUserID, patientName, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ReviewResponse), args.Error(1)
}

func (m *MockDoctorService) GetReviewByConsultationID(ctx context.Context, consultationID uuid.UUID) (*dto.ReviewResponse, error) {
	args := m.Called(ctx, consultationID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.ReviewResponse), args.Error(1)
}

func (m *MockDoctorService) GetDoctorReviews(ctx context.Context, doctorID uuid.UUID, page int, limit int) (*dto.DoctorReviewsResponse, int, error) {
	args := m.Called(ctx, doctorID, page, limit)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).(*dto.DoctorReviewsResponse), args.Int(1), args.Error(2)
}

func TestDoctorHandler_GetByID(t *testing.T) {
	mockSvc := new(MockDoctorService)
	cfg := &config.Config{}
	log := logger.Setup("error")
	h := NewDoctorHandler(mockSvc, cfg, nil, log)

	r := chi.NewRouter()
	r.Get("/doctors/{id}", h.GetByID)

	userID := uuid.New()
	doctorID := uuid.New()
	phone := "+6281122334455"
	license := "123.456"

	specialtyID := "f47ac10b-58cc-4372-a567-0e02b2c3d479"
	fullProfile := &dto.DoctorResponse{
		ID:                   doctorID.String(),
		UserID:               userID.String(),
		Email:                "amir@doctor.com",
		FullName:             "Dr. Amir",
		PhoneNumber:          &phone,
		SpecialtyID:          &specialtyID,
		LicenseNumber:        &license,
		IsCredentialVerified: true,
		ConsultationFee:      150000,
	}

	t.Run("Public view sanitizes sensitive credentials", func(t *testing.T) {
		mockSvc.On("GetProfileByID", mock.Anything, doctorID).Return(fullProfile, nil).Once()

		req, _ := http.NewRequest(http.MethodGet, "/doctors/"+doctorID.String(), nil)
		// Anonymous request context
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
		var envelope struct {
			Success bool               `json:"success"`
			Data    dto.DoctorResponse `json:"data"`
		}
		err := json.NewDecoder(rec.Body).Decode(&envelope)
		require.NoError(t, err)
		assert.True(t, envelope.Success)
		assert.Nil(t, envelope.Data.LicenseNumber) // Sanitized
		assert.Nil(t, envelope.Data.PhoneNumber)   // Sanitized
		assert.Equal(t, "Dr. Amir", envelope.Data.FullName)
		mockSvc.AssertExpectations(t)
	})

	t.Run("Own doctor view returns full profile", func(t *testing.T) {
		mockSvc.On("GetProfileByID", mock.Anything, doctorID).Return(fullProfile, nil).Once()

		req, _ := http.NewRequest(http.MethodGet, "/doctors/"+doctorID.String(), nil)
		// Inject own context
		ctx := context.WithValue(req.Context(), middleware.UserIDContextKey, userID)
		ctx = context.WithValue(ctx, middleware.RolesContextKey, []string{"doctor"})
		req = req.WithContext(ctx)

		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
		var envelope struct {
			Success bool               `json:"success"`
			Data    dto.DoctorResponse `json:"data"`
		}
		err := json.NewDecoder(rec.Body).Decode(&envelope)
		require.NoError(t, err)
		assert.NotNil(t, envelope.Data.LicenseNumber) // Exposed
		assert.Equal(t, "123.456", *envelope.Data.LicenseNumber)
		mockSvc.AssertExpectations(t)
	})
}

func TestDoctorHandler_GetReviews(t *testing.T) {
	mockSvc := new(MockDoctorService)
	cfg := &config.Config{}
	log := logger.Setup("error")
	h := NewDoctorHandler(mockSvc, cfg, nil, log)

	r := chi.NewRouter()
	r.Get("/doctors/{id}/reviews", h.GetReviews)

	doctorID := uuid.New()

	t.Run("Success returns reviews with pagination", func(t *testing.T) {
		comment := "Dokter ramah"
		reviewsResp := &dto.DoctorReviewsResponse{
			Summary: dto.ReviewSummaryResponse{
				AverageRating: 5.0,
				TotalReviews:  1,
				RatingCounts:  map[int]int{5: 1},
			},
			Reviews: []dto.ReviewResponse{
				{
					ID:          uuid.New().String(),
					DoctorID:    doctorID.String(),
					Rating:      5,
					Comment:     &comment,
					PatientName: "Pasien A",
				},
			},
		}

		mockSvc.On("GetDoctorReviews", mock.Anything, doctorID, 1, 10).Return(reviewsResp, 1, nil).Once()

		req, _ := http.NewRequest(http.MethodGet, "/doctors/"+doctorID.String()+"/reviews?page=1&limit=10", nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
		var envelope struct {
			Success    bool                      `json:"success"`
			Data       dto.DoctorReviewsResponse `json:"data"`
			Pagination *struct {
				TotalItems int `json:"total_items"`
			} `json:"pagination"`
		}
		err := json.NewDecoder(rec.Body).Decode(&envelope)
		require.NoError(t, err)
		assert.True(t, envelope.Success)
		assert.Equal(t, 5.0, envelope.Data.Summary.AverageRating)
		assert.Equal(t, 1, envelope.Data.Summary.TotalReviews)
		assert.Len(t, envelope.Data.Reviews, 1)
		mockSvc.AssertExpectations(t)
	})
}

