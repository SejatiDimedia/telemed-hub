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

// StockMutationResponse is the response payload for a stock mutation entry.
type StockMutationResponse struct {
	ID            string  `json:"id"`
	MedicineID    string  `json:"medicine_id"`
	MedicineName  string  `json:"medicine_name"`
	MutationType  string  `json:"mutation_type"`
	Quantity      int     `json:"quantity"`
	StockBefore   int     `json:"stock_before"`
	StockAfter    int     `json:"stock_after"`
	ReferenceType string  `json:"reference_type"`
	ReferenceID   *string `json:"reference_id,omitempty"`
	Notes         string  `json:"notes"`
	CreatedBy     string  `json:"created_by"`
	CreatedAt     string  `json:"created_at"`
}
