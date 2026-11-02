-- Logical relationships (no DB constraints, enforced in service layer):
--   col_benchmarks.country_id -> countries.id
-- exchange_rates.rate_to_idr_micro = IDR per 1 unit of currency x 1,000,000 (integer, avoids float drift).
-- est_*_idr are whole rupiah. NULL = could not estimate (no salary, no rate, or no benchmark).

ALTER TABLE jobs ADD COLUMN est_gross_monthly_idr INTEGER NULL DEFAULT NULL;
ALTER TABLE jobs ADD COLUMN est_tax_monthly_idr INTEGER NULL DEFAULT NULL;
ALTER TABLE jobs ADD COLUMN est_col_monthly_idr INTEGER NULL DEFAULT NULL;
ALTER TABLE jobs ADD COLUMN est_net_savings_monthly_idr INTEGER NULL DEFAULT NULL;
CREATE INDEX idx_jobs_est_net_savings_monthly_idr ON jobs (est_net_savings_monthly_idr);

CREATE TABLE exchange_rates (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  currency_code     TEXT NOT NULL,
  rate_to_idr_micro INTEGER NOT NULL,
  fetched_at        TEXT NOT NULL,
  created_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_exchange_rates_currency_code ON exchange_rates (currency_code);

-- monthly_minor: rent (1 bedroom, city centre) + non-rent living costs, single person, in local currency cents.
CREATE TABLE col_benchmarks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  country_id    INTEGER NOT NULL,
  currency_code TEXT NOT NULL,
  monthly_minor INTEGER NOT NULL,
  source_note   TEXT NOT NULL,
  as_of_date    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_col_benchmarks_country_id ON col_benchmarks (country_id);

INSERT INTO col_benchmarks (country_id, currency_code, monthly_minor, source_note, as_of_date) VALUES
  ((SELECT id FROM countries WHERE code = 'SG'), 'SGD', 490000,
   'Rent about SGD 3,400 (1BR centre, uhomes) + non-rent about SGD 1,490 (Expatica citing Numbeo, Jun 2026). Rough default, edit in settings.',
   '2026-11-02'),
  ((SELECT id FROM countries WHERE code = 'MY'), 'MYR', 500000,
   'Rent about MYR 2,500 (1BR centre, Numbeo-based comparison page) + non-rent about MYR 2,540 (undated article citing Numbeo). Sources conflict, rough default, edit in settings.',
   '2026-11-02'),
  ((SELECT id FROM countries WHERE code = 'NZ'), 'NZD', 335000,
   'Rent about NZD 1,500 (1BR centre, sources range 1,300-2,600) + non-rent about NZD 1,850 (Numbeo, Oct 2026). Rough default, edit in settings.',
   '2026-11-02');
