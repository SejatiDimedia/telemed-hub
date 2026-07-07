ALTER TABLE medicines
ADD COLUMN created_by UUID,
ADD COLUMN updated_by UUID,
ADD COLUMN deleted_by UUID,
ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE INDEX idx_medicines_deleted_at ON medicines(deleted_at) WHERE deleted_at IS NULL;
