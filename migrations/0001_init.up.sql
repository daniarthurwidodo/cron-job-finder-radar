-- Logical relationships (no DB constraints, enforced in service layer):
--   jobs.company_id      -> companies.id
--   jobs.country_id      -> countries.id
--   jobs.work_mode_id    -> work_modes.id
--   jobs.seniority_id    -> seniorities.id
--   jobs.status_id       -> job_statuses.id
--   job_sources.job_id   -> jobs.id
--   job_tech_tags.job_id -> jobs.id
-- Dates are ISO-8601 UTC text. Money is integer minor units (cents).
-- code columns carry a technical UNIQUE index so lookup seeds cannot be duplicated.

CREATE TABLE countries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code       TEXT NOT NULL,
  label      TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX uq_countries_code ON countries (code);

CREATE TABLE work_modes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code       TEXT NOT NULL,
  label      TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX uq_work_modes_code ON work_modes (code);

CREATE TABLE seniorities (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code       TEXT NOT NULL,
  label      TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX uq_seniorities_code ON seniorities (code);

CREATE TABLE job_statuses (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code       TEXT NOT NULL,
  label      TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX uq_job_statuses_code ON job_statuses (code);

INSERT INTO countries (code, label, sort_order) VALUES
  ('SG', 'Singapore', 1),
  ('MY', 'Malaysia', 2),
  ('NZ', 'New Zealand', 3);

INSERT INTO work_modes (code, label, sort_order) VALUES
  ('full_time', 'Full-time', 1),
  ('hybrid', 'Hybrid', 2),
  ('flexible', 'Flexible', 3),
  ('on_site', 'On-site', 4);

INSERT INTO seniorities (code, label, sort_order) VALUES
  ('entry', 'Entry', 1),
  ('mid', 'Mid', 2),
  ('senior', 'Senior', 3),
  ('lead', 'Lead / Staff', 4);

INSERT INTO job_statuses (code, label, sort_order) VALUES
  ('discovered', 'Discovered', 1),
  ('bookmarked', 'Bookmarked', 2),
  ('applied', 'Applied', 3),
  ('interviewing', 'Interviewing', 4),
  ('offer', 'Offer', 5),
  ('rejected', 'Rejected', 6),
  ('archived', 'Archived', 7);

CREATE TABLE companies (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  is_mnc          INTEGER NOT NULL DEFAULT 0,
  is_accredited   INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TEXT NULL DEFAULT NULL -- NULL = not deleted
);
CREATE INDEX idx_companies_name_normalized ON companies (name_normalized);

-- posted_at NULL: source did not publish a posting date.
-- salary_*_monthly_minor NULL: source did not publish a salary (job is kept, flagged "no salary").
CREATE TABLE jobs (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id               INTEGER NOT NULL,
  title                    TEXT NOT NULL,
  city                     TEXT NOT NULL,
  country_id               INTEGER NOT NULL,
  work_mode_id             INTEGER NOT NULL,
  seniority_id             INTEGER NOT NULL,
  status_id                INTEGER NOT NULL,
  description              TEXT NOT NULL DEFAULT '',
  has_visa_sponsorship     INTEGER NOT NULL DEFAULT 0,
  posted_at                TEXT NULL DEFAULT NULL,
  dedup_hash               TEXT NOT NULL,
  currency_code            TEXT NOT NULL,
  salary_min_monthly_minor INTEGER NULL DEFAULT NULL,
  salary_max_monthly_minor INTEGER NULL DEFAULT NULL,
  stack_match_score        INTEGER NOT NULL DEFAULT 0,
  priority_score           INTEGER NOT NULL DEFAULT 0,
  created_at               TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at               TEXT NULL DEFAULT NULL
);
CREATE UNIQUE INDEX uq_jobs_dedup_hash ON jobs (dedup_hash);
CREATE INDEX idx_jobs_company_id ON jobs (company_id);
CREATE INDEX idx_jobs_country_id ON jobs (country_id);
CREATE INDEX idx_jobs_work_mode_id ON jobs (work_mode_id);
CREATE INDEX idx_jobs_seniority_id ON jobs (seniority_id);
CREATE INDEX idx_jobs_status_id ON jobs (status_id);
CREATE INDEX idx_jobs_priority_score ON jobs (priority_score);

CREATE TABLE job_sources (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id        INTEGER NOT NULL,
  source_code   TEXT NOT NULL,
  source_job_id TEXT NOT NULL,
  source_url    TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at  TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_job_sources_job_id ON job_sources (job_id);
CREATE INDEX idx_job_sources_source_url ON job_sources (source_url);

CREATE TABLE job_tech_tags (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id     INTEGER NOT NULL,
  tech_tag   TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_job_tech_tags_job_id ON job_tech_tags (job_id);

-- finished_at / error_message NULL: run still in progress / run had no error.
CREATE TABLE scrape_runs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  source_code     TEXT NOT NULL,
  started_at      TEXT NOT NULL,
  finished_at     TEXT NULL DEFAULT NULL,
  found_count     INTEGER NOT NULL DEFAULT 0,
  inserted_count  INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  filtered_count  INTEGER NOT NULL DEFAULT 0,
  invalid_count   INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT NULL DEFAULT NULL,
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_scrape_runs_source_code ON scrape_runs (source_code);
