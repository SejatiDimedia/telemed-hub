package model

import (
	"time"

	"github.com/google/uuid"
)

// Medicine represents the catalog item for inventory.
type Medicine struct {
	ID                   uuid.UUID
	Name                 string
	UnitPrice            float64
	StockQuantity        int
	RequiresPrescription bool
	CreatedAt            time.Time
	UpdatedAt            time.Time
	CreatedBy            *uuid.UUID
	UpdatedBy            *uuid.UUID
	DeletedAt            *time.Time
	DeletedBy            *uuid.UUID
}
