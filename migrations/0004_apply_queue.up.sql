-- Apply queue state on jobs. NULL = not in that state (documented per column).
-- apply_queued_at  NULL: job is not in the apply queue.
-- apply_skipped_at NULL: user has not skipped the queued job.
-- applied_at       NULL: user has not confirmed applying.
ALTER TABLE jobs ADD COLUMN apply_queued_at TEXT NULL DEFAULT NULL;
ALTER TABLE jobs ADD COLUMN apply_skipped_at TEXT NULL DEFAULT NULL;
ALTER TABLE jobs ADD COLUMN applied_at TEXT NULL DEFAULT NULL;
CREATE INDEX idx_jobs_apply_queued_at ON jobs (apply_queued_at);
