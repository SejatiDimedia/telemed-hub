package validator

import (
	"errors"
	"strings"

	"github.com/timurdianradhasejati/telemed_hub/internal/ai/dto"
)

type ValidationError struct {
	Field string `json:"field"`
	Issue string `json:"issue"`
}

type ValidationErrors []ValidationError

func (ve ValidationErrors) Error() string {
	var sb strings.Builder
	for i, err := range ve {
		if i > 0 {
			sb.WriteString("; ")
		}
		sb.WriteString(err.Field + ": " + err.Issue)
	}
	return sb.String()
}

func ValidatePostMessage(req dto.PostMessageRequest) error {
	var errs ValidationErrors

	msg := strings.TrimSpace(req.Message)
	if msg == "" {
		errs = append(errs, ValidationError{Field: "message", Issue: "must not be empty"})
	} else {
		runes := []rune(msg)
		if len(runes) < 5 {
			errs = append(errs, ValidationError{Field: "message", Issue: "must be at least 5 characters long"})
		} else if len(runes) > 2000 {
			errs = append(errs, ValidationError{Field: "message", Issue: "must not exceed 2000 characters"})
		}
	}

	if len(errs) > 0 {
		return errs
	}

	return nil
}

func ExtractValidationDetails(err error) []map[string]string {
	var valErrs ValidationErrors
	if errors.As(err, &valErrs) {
		details := make([]map[string]string, len(valErrs))
		for i, ve := range valErrs {
			details[i] = map[string]string{
				"field": ve.Field,
				"issue": ve.Issue,
			}
		}
		return details
	}
	return []map[string]string{
		{
			"issue": err.Error(),
		},
	}
}
