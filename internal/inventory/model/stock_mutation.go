package model

import (
	"time"

	"github.com/google/uuid"
)

type StockMutation struct {
	ID            uuid.UUID
	MedicineID    uuid.UUID
	MutationType  string // "in" or "out"
	Quantity      int
	StockBefore   int
	StockAfter    int
	ReferenceType string // "initial_stock", "manual_adjustment", "order_fulfillment", "order_cancel_refund"
	ReferenceID   *uuid.UUID
	Notes         string
	CreatedBy     uuid.UUID
	CreatedAt     time.Time
}
