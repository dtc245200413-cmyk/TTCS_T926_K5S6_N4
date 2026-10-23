ALTER TABLE candidates ADD COLUMN current_stage VARCHAR(50) NULL;
UPDATE candidates SET current_stage = status, updated_at = updated_at WHERE current_stage IS NULL AND status IN ('NEW','REJECTED');
ALTER TABLE candidates MODIFY COLUMN current_stage VARCHAR(50) NOT NULL DEFAULT 'NEW';
