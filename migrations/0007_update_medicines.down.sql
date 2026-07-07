DROP INDEX IF EXISTS idx_medicines_deleted_at;

ALTER TABLE medicines
DROP COLUMN IF EXISTS created_by,
DROP COLUMN IF EXISTS updated_by,
DROP COLUMN IF EXISTS deleted_by,
DROP COLUMN IF EXISTS deleted_at;
