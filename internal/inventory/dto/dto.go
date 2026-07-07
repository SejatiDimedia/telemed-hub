package dto

// CreateMedicineRequest is the request payload to create a new medicine.
type CreateMedicineRequest struct {
	Name                 string  `json:"name"`
	UnitPrice            float64 `json:"unit_price"`
	StockQuantity        int     `json:"stock_quantity"`
	RequiresPrescription bool    `json:"requires_prescription"`
}

// UpdateMedicineRequest is the request payload to update an existing medicine.
type UpdateMedicineRequest struct {
	Name                 string  `json:"name"`
	UnitPrice            float64 `json:"unit_price"`
	StockQuantity        int     `json:"stock_quantity"`
	RequiresPrescription bool    `json:"requires_prescription"`
}

// MedicineResponse is the response payload for a single medicine.
type MedicineResponse struct {
	ID                   string  `json:"id"`
	Name                 string  `json:"name"`
	UnitPrice            float64 `json:"unit_price"`
	StockQuantity        int     `json:"stock_quantity"`
	RequiresPrescription bool    `json:"requires_prescription"`
	CreatedAt            string  `json:"created_at"`
	UpdatedAt            string  `json:"updated_at"`
}
