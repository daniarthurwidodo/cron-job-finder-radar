DELETE FROM work_authorizations WHERE country_id = (SELECT id FROM countries WHERE code = 'AU');
DELETE FROM col_benchmarks WHERE country_id = (SELECT id FROM countries WHERE code = 'AU');
DELETE FROM countries WHERE code = 'AU';
