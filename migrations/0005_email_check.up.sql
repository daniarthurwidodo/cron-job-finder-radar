-- Logical relationships (no DB constraints, enforced in service layer):
--   job_emails.job_id -> jobs.id
-- google_connections holds at most one row (the connected account). refresh_token is local-only data.
-- job_emails.suggested_status_code NULL: the category implies no status change.
-- is_dismissed: 1 once the user confirmed or dismissed the suggestion (handled).

CREATE TABLE google_connections (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  account_email TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  scope         TEXT NOT NULL,
  connected_at  TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE job_emails (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id                INTEGER NOT NULL,
  gmail_message_id      TEXT NOT NULL,
  thread_id             TEXT NOT NULL,
  from_address          TEXT NOT NULL,
  subject               TEXT NOT NULL,
  snippet               TEXT NOT NULL,
  received_at           TEXT NOT NULL,
  category              TEXT NOT NULL,
  suggested_status_code TEXT NULL DEFAULT NULL,
  match_reason          TEXT NOT NULL,
  is_dismissed          INTEGER NOT NULL DEFAULT 0,
  created_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_job_emails_job_id ON job_emails (job_id);
CREATE INDEX idx_job_emails_gmail_message_id ON job_emails (gmail_message_id);

-- finished_at / error_message NULL: run still in progress / no error.
CREATE TABLE email_sync_runs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at    TEXT NOT NULL,
  finished_at   TEXT NULL DEFAULT NULL,
  fetched_count INTEGER NOT NULL DEFAULT 0,
  matched_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT NULL DEFAULT NULL,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
