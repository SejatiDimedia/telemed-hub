package validator

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/timurdianradhasejati/telemed_hub/internal/doctor/dto"
)

func TestValidateCreateReview(t *testing.T) {
	t.Run("Valid rating and comment", func(t *testing.T) {
		comment := "Dokter sangat ramah dan informatif."
		req := dto.CreateReviewRequest{
			Rating:  5,
			Comment: &comment,
		}
		err := ValidateCreateReview(req)
		assert.NoError(t, err)
	})

	t.Run("Valid rating without comment", func(t *testing.T) {
		req := dto.CreateReviewRequest{
			Rating: 4,
		}
		err := ValidateCreateReview(req)
		assert.NoError(t, err)
	})

	t.Run("Invalid rating below 1", func(t *testing.T) {
		req := dto.CreateReviewRequest{
			Rating: 0,
		}
		err := ValidateCreateReview(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "rating: must be an integer between 1 and 5")
	})

	t.Run("Invalid rating above 5", func(t *testing.T) {
		req := dto.CreateReviewRequest{
			Rating: 6,
		}
		err := ValidateCreateReview(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "rating: must be an integer between 1 and 5")
	})

	t.Run("Invalid comment too long", func(t *testing.T) {
		longComment := strings.Repeat("a", 1001)
		req := dto.CreateReviewRequest{
			Rating:  5,
			Comment: &longComment,
		}
		err := ValidateCreateReview(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "comment: must not exceed 1000 characters")
	})
}
