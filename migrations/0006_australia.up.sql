-- Logical relationships (no DB constraints, enforced in service layer):
--   col_benchmarks.country_id, work_authorizations.country_id -> countries.id
-- AU defaults below are rough estimates, not verified figures: edit them in settings.

INSERT INTO countries (code, label, sort_order) VALUES ('AU', 'Australia', 4);

INSERT INTO col_benchmarks (country_id, currency_code, monthly_minor, source_note, as_of_date) VALUES
  ((SELECT id FROM countries WHERE code = 'AU'), 'AUD', 485000,
   'Sydney: rent about AUD 3,000 (1BR centre, sources range 2,200-3,618) + non-rent about AUD 1,850 (Expatica citing Numbeo). Rough default, edit in settings.',
   '2026-11-02');

INSERT INTO work_authorizations (country_id, statement) VALUES
  ((SELECT id FROM countries WHERE code = 'AU'), 'Open to relocation to Australia. Requires visa sponsorship (Skills in Demand visa, subclass 482).');
