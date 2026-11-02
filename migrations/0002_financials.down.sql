DROP TABLE col_benchmarks;
DROP TABLE exchange_rates;
DROP INDEX idx_jobs_est_net_savings_monthly_idr;
ALTER TABLE jobs DROP COLUMN est_net_savings_monthly_idr;
ALTER TABLE jobs DROP COLUMN est_col_monthly_idr;
ALTER TABLE jobs DROP COLUMN est_tax_monthly_idr;
ALTER TABLE jobs DROP COLUMN est_gross_monthly_idr;
