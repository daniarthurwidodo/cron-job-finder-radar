-- Logical relationships (no DB constraints, enforced in service layer):
--   work_authorizations.country_id -> countries.id
--   documents.job_id              -> jobs.id
-- kind values: 'cv', 'cover_letter'. content is Markdown (CV) or plain text (letter).

CREATE TABLE work_authorizations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  country_id INTEGER NOT NULL,
  statement  TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_work_authorizations_country_id ON work_authorizations (country_id);

INSERT INTO work_authorizations (country_id, statement) VALUES
  ((SELECT id FROM countries WHERE code = 'SG'), 'Open to relocation to Singapore. Requires visa sponsorship (Employment Pass).'),
  ((SELECT id FROM countries WHERE code = 'MY'), 'Open to relocation to Malaysia. Requires visa sponsorship (Employment Pass).'),
  ((SELECT id FROM countries WHERE code = 'NZ'), 'Open to relocation to New Zealand. Requires visa sponsorship (Accredited Employer Work Visa).');

CREATE TABLE documents (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id     INTEGER NOT NULL,
  kind       TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_documents_job_id ON documents (job_id);
