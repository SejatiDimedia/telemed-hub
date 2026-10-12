-- Rollback migration 0016: Drop doctor reviews and remove rating stats from doctors

DROP TABLE IF EXISTS doctor_reviews;

DROP INDEX IF EXISTS idx_doctors_rating;

ALTER TABLE doctors DROP COLUMN IF EXISTS rating;
ALTER TABLE doctors DROP COLUMN IF EXISTS total_reviews;
