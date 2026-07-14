package service

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/timurdianradhasejati/telemed_hub/internal/inventory/dto"
	"github.com/timurdianradhasejati/telemed_hub/internal/inventory/model"
	"github.com/timurdianradhasejati/telemed_hub/internal/inventory/repository"
)

type InventoryServiceImpl struct {
	repo repository.MedicineRepository
}

func NewInventoryService(repo repository.MedicineRepository) *InventoryServiceImpl {
	return &InventoryServiceImpl{repo: repo}
}

func (s *InventoryServiceImpl) Create(ctx context.Context, adminUserID uuid.UUID, req dto.CreateMedicineRequest) (*dto.MedicineResponse, error) {
	med := &model.Medicine{
		Name:                 req.Name,
		UnitPrice:            req.UnitPrice,
		StockQuantity:        req.StockQuantity,
		RequiresPrescription: req.RequiresPrescription,
		CreatedBy:            &adminUserID,
	}

	if err := s.repo.Create(ctx, med); err != nil {
		return nil, err
	}

	// Record initial stock mutation
	if med.StockQuantity > 0 {
		_ = s.repo.RecordMutation(ctx, nil, &model.StockMutation{
			MedicineID:    med.ID,
			MutationType:  "in",
			Quantity:      med.StockQuantity,
			StockBefore:   0,
			StockAfter:    med.StockQuantity,
			ReferenceType: "initial_stock",
			CreatedBy:     adminUserID,
		})
	}

	return toResponse(med), nil
}

func (s *InventoryServiceImpl) Update(ctx context.Context, adminUserID uuid.UUID, id uuid.UUID, req dto.UpdateMedicineRequest) (*dto.MedicineResponse, error) {
	med, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrMedicineNotFound) {
			return nil, ErrMedicineNotFound
		}
		return nil, err
	}

	oldStock := med.StockQuantity
	newStock := req.StockQuantity
	stockDiff := newStock - oldStock

	med.Name = req.Name
	med.UnitPrice = req.UnitPrice
	med.StockQuantity = req.StockQuantity
	med.RequiresPrescription = req.RequiresPrescription
	med.UpdatedBy = &adminUserID

	if err := s.repo.Update(ctx, med); err != nil {
		if errors.Is(err, repository.ErrMedicineNotFound) {
			return nil, ErrMedicineNotFound
		}
		return nil, err
	}

	// Record manual adjustment if stock changed
	if stockDiff != 0 {
		mutationType := "in"
		qty := stockDiff
		if stockDiff < 0 {
			mutationType = "out"
			qty = -stockDiff
		}
		_ = s.repo.RecordMutation(ctx, nil, &model.StockMutation{
			MedicineID:    med.ID,
			MutationType:  mutationType,
			Quantity:      qty,
			StockBefore:   oldStock,
			StockAfter:    newStock,
			ReferenceType: "manual_adjustment",
			CreatedBy:     adminUserID,
		})
	}

	return toResponse(med), nil
}

func (s *InventoryServiceImpl) GetByID(ctx context.Context, id uuid.UUID) (*dto.MedicineResponse, error) {
	med, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrMedicineNotFound) {
			return nil, ErrMedicineNotFound
		}
		return nil, err
	}
	return toResponse(med), nil
}

func (s *InventoryServiceImpl) List(ctx context.Context, nameFilter *string, reqPrescFilter *bool, page, limit int) ([]*dto.MedicineResponse, int, error) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	medicines, total, err := s.repo.List(ctx, nameFilter, reqPrescFilter, page, limit)
	if err != nil {
		return nil, 0, err
	}

	respList := make([]*dto.MedicineResponse, 0, len(medicines))
	for _, m := range medicines {
		respList = append(respList, toResponse(m))
	}
	return respList, total, nil
}

func (s *InventoryServiceImpl) Delete(ctx context.Context, adminUserID uuid.UUID, id uuid.UUID) error {
	err := s.repo.SoftDelete(ctx, id, adminUserID)
	if err != nil {
		if errors.Is(err, repository.ErrMedicineNotFound) {
			return ErrMedicineNotFound
		}
		return err
	}
	return nil
}

func toResponse(m *model.Medicine) *dto.MedicineResponse {
	return &dto.MedicineResponse{
		ID:                   m.ID.String(),
		Name:                 m.Name,
		UnitPrice:            m.UnitPrice,
		StockQuantity:        m.StockQuantity,
		RequiresPrescription: m.RequiresPrescription,
		CreatedAt:            m.CreatedAt.Format(time.RFC3339),
		UpdatedAt:            m.UpdatedAt.Format(time.RFC3339),
	}
}

func (s *InventoryServiceImpl) DecrementStock(ctx context.Context, tx pgx.Tx, medicineID uuid.UUID, quantity int) error {
	m, err := s.repo.GetByIDForUpdate(ctx, tx, medicineID)
	if err != nil {
		if errors.Is(err, repository.ErrMedicineNotFound) {
			return ErrMedicineNotFound
		}
		return err
	}

	if m.StockQuantity < quantity {
		return ErrOutOfStock
	}

	newStock := m.StockQuantity - quantity
	if err := s.repo.UpdateStock(ctx, tx, medicineID, newStock); err != nil {
		return err
	}

	// Record mutation
	return s.repo.RecordMutation(ctx, tx, &model.StockMutation{
		MedicineID:    medicineID,
		MutationType:  "out",
		Quantity:      quantity,
		StockBefore:   m.StockQuantity,
		StockAfter:    newStock,
		ReferenceType: "order_fulfillment",
		CreatedBy:     uuid.Nil,
	})
}

func (s *InventoryServiceImpl) IncrementStock(ctx context.Context, tx pgx.Tx, medicineID uuid.UUID, quantity int) error {
	m, err := s.repo.GetByIDForUpdate(ctx, tx, medicineID)
	if err != nil {
		if errors.Is(err, repository.ErrMedicineNotFound) {
			return ErrMedicineNotFound
		}
		return err
	}

	newStock := m.StockQuantity + quantity
	if err := s.repo.UpdateStock(ctx, tx, medicineID, newStock); err != nil {
		return err
	}

	// Record mutation
	return s.repo.RecordMutation(ctx, tx, &model.StockMutation{
		MedicineID:    medicineID,
		MutationType:  "in",
		Quantity:      quantity,
		StockBefore:   m.StockQuantity,
		StockAfter:    newStock,
		ReferenceType: "order_cancel_refund",
		CreatedBy:     uuid.Nil,
	})
}

func (s *InventoryServiceImpl) ListMutations(ctx context.Context, medicineID uuid.UUID, page, limit int) ([]*dto.StockMutationResponse, int, error) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	mutations, total, err := s.repo.ListMutations(ctx, medicineID, page, limit)
	if err != nil {
		return nil, 0, err
	}

	// Fetch medicine name
	medName := "Obat"
	if med, err := s.repo.GetByID(ctx, medicineID); err == nil {
		medName = med.Name
	}

	respList := make([]*dto.StockMutationResponse, 0, len(mutations))
	for _, m := range mutations {
		var refIDStr *string
		if m.ReferenceID != nil {
			str := m.ReferenceID.String()
			refIDStr = &str
		}
		respList = append(respList, &dto.StockMutationResponse{
			ID:            m.ID.String(),
			MedicineID:    m.MedicineID.String(),
			MedicineName:  medName,
			MutationType:  m.MutationType,
			Quantity:      m.Quantity,
			StockBefore:   m.StockBefore,
			StockAfter:    m.StockAfter,
			ReferenceType: m.ReferenceType,
			ReferenceID:   refIDStr,
			Notes:         m.Notes,
			CreatedBy:     m.CreatedBy.String(),
			CreatedAt:     m.CreatedAt.Format(time.RFC3339),
		})
	}
	return respList, total, nil
}


