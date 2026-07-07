package validator

import (
	"fmt"

	"github.com/timurdianradhasejati/telemed_hub/internal/inventory/dto"
)

type ValidationError struct {
	Field string
	Issue string
}

func (e ValidationError) Error() string {
	return fmt.Sprintf("field %q: %s", e.Field, e.Issue)
}

type ValidationErrors []ValidationError

func (ve ValidationErrors) Error() string {
	if len(ve) == 0 {
		return "validation errors"
	}
	return ve[0].Error()
}

// ValidateCreateMedicine validates CreateMedicineRequest.
func ValidateCreateMedicine(req dto.CreateMedicineRequest) error {
	var errs ValidationErrors

	if req.Name == "" {
		errs = append(errs, ValidationError{Field: "name", Issue: "must not be empty"})
	}
	if req.UnitPrice < 0 {
		errs = append(errs, ValidationError{Field: "unit_price", Issue: "must be greater than or equal to 0"})
	}
	if req.StockQuantity < 0 {
		errs = append(errs, ValidationError{Field: "stock_quantity", Issue: "must be greater than or equal to 0"})
	}

	if len(errs) > 0 {
		return errs
	}
	return nil
}

// ValidateUpdateMedicine validates UpdateMedicineRequest.
func ValidateUpdateMedicine(req dto.UpdateMedicineRequest) error {
	var errs ValidationErrors

	if req.Name == "" {
		errs = append(errs, ValidationError{Field: "name", Issue: "must not be empty"})
	}
	if req.UnitPrice < 0 {
		errs = append(errs, ValidationError{Field: "unit_price", Issue: "must be greater than or equal to 0"})
	}
	if req.StockQuantity < 0 {
		errs = append(errs, ValidationError{Field: "stock_quantity", Issue: "must be greater than or equal to 0"})
	}

	if len(errs) > 0 {
		return errs
	}
	return nil
}
