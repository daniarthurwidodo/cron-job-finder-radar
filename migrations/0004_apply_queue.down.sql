DROP INDEX idx_jobs_apply_queued_at;
ALTER TABLE jobs DROP COLUMN applied_at;
ALTER TABLE jobs DROP COLUMN apply_skipped_at;
ALTER TABLE jobs DROP COLUMN apply_queued_at;
