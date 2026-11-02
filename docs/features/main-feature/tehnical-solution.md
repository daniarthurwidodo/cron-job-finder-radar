# Technical Solution — Expat Job Radar

Source: `prd.md`. Where PRD conflicts with project rules (global constitution), this doc wins and the change is listed in section 9.

## 1. Stack (as initialized)

| Concern | Choice | Note |
| :--- | :--- | :--- |
| Framework | Next.js (App Router, TypeScript) | Already scaffolded, no Tailwind yet |
| DB | SQLite via `better-sqlite3` | `lib/db.ts`, file `data/app.db`, WAL |
| Query layer | Plain parameterized SQL in repositories | ORM (Drizzle/Prisma) deferred — see Open Questions |
| Cron | `GET /api/cron/scrape` + Bearer `CRON_SECRET` | Triggered by system `cron` / GitHub Actions |
| Calendar | `googleapis` (Calendar v3, OAuth 2.0) | Phase 4 only |
| UI | Tailwind CSS | Decided. Not installed yet, added in Phase 4 |

## 2. Layers (R21)

```
app/                      presentation: pages, components, route handlers (thin)
lib/services/             business logic: scoring, tax, savings, dedup, orchestration
lib/repositories/         data layer: SQL only, no rules
lib/scrapers/             data layer (external I/O): one module per source
lib/constants.ts          statuses, work modes, countries, weights, limits
lib/db.ts                 connection (exists)
migrations/               versioned up/down SQL
```

Flow: route/page -> service -> repository / scraper. Presentation never touches repositories.

## 3. Pipeline

```
cron -> ScraperRegistry.runAll()
     -> per source: fetch -> parse -> RawJob[]
     -> JobNormalizer (title, location, work mode, seniority, salary)
     -> DedupService (dedup_hash)
     -> StackMatchService (keyword matrix -> score)
     -> FilterService (drop junior/intern/on-site/contract per rules)
     -> FinancialService (tax + CoL + FX -> net savings IDR)
     -> JobRepository.upsert
```

Sequential per source (`for...of` + `await`), failure of one source is logged and does not stop the run.

## 4. Scrapers

One module per source implementing `fetchJobs(): Promise<RawJob[]>` (plain function map, no class hierarchy until a second shared behavior appears).

| Priority | Source | Country | Type |
| :--- | :--- | :--- | :--- |
| 1 | mycareersfuture.gov.sg | SG | Public API (best first target) |
| 1 | jobstreet.com.sg | SG | Scrape |
| 2 | hiredly.com | MY | Scrape |
| 2 | jobstreet MY | MY | Scrape |
| 3 | seek.co.nz, trademe.co.nz, workhere.co.nz | NZ | Scrape |
| 4 | linkedin | all | Logged-in scrape, accepted risk, built last |
| 4 | Relocate.me, Tech in Asia Jobs | all | Scrape / feed |
| 5 | Randstad, Michael Page, Robert Walters, Hays, Monroe Consulting | all | Scrape, agency career pages |

Risks:
- **LinkedIn:** decided to scrape with a logged-in session despite ToS and ban risk. Credentials or session cookie only in `.env.local` (git-ignored), never in code or DB. Built last, runs behind an on/off setting, low request rate, one failure disables it for the run. Other sources must not depend on it.
- Scraping may break on markup changes; each scraper isolated, logs counts per run.
- Respect robots.txt and rate limit (constant delay between requests).

## 5. Dedup ("make sure job post is unique")

Two keys:
- `dedup_hash` = sha256 of normalized `company + title + city` (lowercase, trimmed, collapsed whitespace). Technical UNIQUE index (allowed by R19d).
- `apply_url` normalized (strip tracking params). Checked in service layer before insert.

Same job from several sources: first wins, later sources add a row to `job_sources` (source, url) instead of a new job.

## 6. Scoring and ranking

- **Stack match score** = matched keywords / total target keywords, 0–100, keyword matrix in constants (Next.js, Angular, TypeScript, Node.js, NestJS, .NET, PHP, WordPress, PostgreSQL, MongoDB, AI, RAG). Whole-word, case-insensitive match against title + description.
- **Work mode rank:** Full-time > Hybrid > Flexible (higher = better). Strict on-site and contract roles are excluded (decided).
- **Country preference:** SG > MY > NZ (from PRD "additional"; overrides table order in PRD section 2).
- **Priority score** = weighted sum of: net savings rank, stack match, work mode rank, country preference, MNC/accredited employer flag. Weights in constants.
- **Primary sort:** net potential monthly savings (IDR).

## 7. Financial engine

All money stored as integer minor units (cents). FX rates as integer micro-rate or decimal text parsed to number at the service boundary; never FLOAT for money columns.

```
net_savings_idr = ((gross_monthly - monthly_tax) - base_col) * rate_to_idr
```

- Salary normalization: annual -> monthly (/12), hourly/daily rejected unless convertible; missing salary -> savings = NULL, job still listed, flagged "no salary".
- Use `salary_min` for a conservative figure, show min–max range in UI.
- **Tax profiles** (pure functions, one per country, bracket tables in constants, tax year noted):
  - SG: resident progressive rates (IRAS). EP/COMPASS threshold checked as eligibility flag.
  - NZ: PAYE bands + ACC earners' levy.
  - MY: resident bracket (non-resident flat rate as flag).
  - Rates change yearly: tables carry `tax_year`; must be verified against official sources before Phase 2 is closed.
- **CoL:** per-city editable benchmark in `col_benchmarks` (monthly, native currency minor units), seeded with defaults, editable in settings.
- **FX:** daily fetch of SGD/NZD/MYR/USD -> IDR from a free API; cached in `exchange_rates`. On fetch failure use last cached rate and show its age.

## 8. Database (SQLite)

Conventions per R19: snake_case, plural tables, `INTEGER PRIMARY KEY AUTOINCREMENT` surrogate PK, no FK constraints, no CASCADE, no CHECK, `created_at`/`updated_at` everywhere, soft delete via `deleted_at`, every logical FK indexed, dates as ISO-8601 UTC text (SQLite has no native datetime), money as integer minor units, statuses/work modes in lookup tables.

```sql
-- lookup tables: job_statuses, work_modes, seniorities, countries, event_types
-- each: id, code (technical UNIQUE), label, sort_order, created_at, updated_at

-- companies: id, name, name_normalized, is_mnc, is_accredited, created_at, updated_at, deleted_at

-- jobs
--   id, company_id (logical FK companies.id), title, city, country_id (logical FK countries.id),
--   work_mode_id, seniority_id, status_id (logical FKs),
--   description, visa_sponsorship (INTEGER 0/1), posted_at,
--   dedup_hash (technical UNIQUE), currency_code,
--   salary_min_minor, salary_max_minor (NULL = not posted, documented),
--   stack_match_score, priority_score,
--   est_gross_idr, est_tax_idr, est_col_idr, est_net_savings_idr (integer IDR, NULL when no salary),
--   created_at, updated_at, deleted_at
--   indexes: idx_jobs_company_id, idx_jobs_country_id, idx_jobs_status_id,
--            idx_jobs_est_net_savings_idr, idx_jobs_priority_score

-- job_sources: id, job_id, source_code, source_url, first_seen_at, last_seen_at, created_at, updated_at
-- job_tech_tags: id, job_id, tech_tag   (replaces tech_stack_json: 1NF)
-- exchange_rates: id, currency_code, rate_to_idr_micro, fetched_at, created_at, updated_at
-- col_benchmarks: id, city, currency_code, monthly_minor, created_at, updated_at
-- calendar_events: id, job_id (logical FK), event_type_id, google_event_id, start_at, end_at, summary, created_at, updated_at
-- scrape_runs: id, source_code, started_at, finished_at, found_count, inserted_count, error_message, created_at, updated_at
-- documents: id, job_id, kind (cover_letter | cv), content, created_at, updated_at   (Phase 5)
```

Migrations: numbered `.sql` files with matching `down`, run by a small runner script on startup/`npm run migrate`. Logical FK relationships documented in migration comments. Delete of a job = soft delete; child cleanup done in service.

## 9. Deviations from PRD (and why)

| PRD | Here | Reason |
| :--- | :--- | :--- |
| `FOREIGN KEY ... ON DELETE CASCADE` on `calendar_events` | logical FK + index, cleanup in service | R19d |
| `apply_url UNIQUE` as business rule | service-layer dedup + technical `dedup_hash` UNIQUE | R19d |
| `REAL` money columns | integer minor units | R19e |
| `tech_stack_json` | `job_tech_tags` table | R19a (1NF) |
| status/work_mode as free `TEXT` | lookup tables | R19e |
| Status lists differ (`Rejected` in 3.3, `Archived` in schema) | one list: Discovered, Bookmarked, Applied, Interviewing, Offer, Rejected, Archived | consistency |
| Auckland listed first | SG > MY > NZ | PRD "additional" section |
| Next.js 14+ | scaffolded latest | already installed |

## 10. CV and cover letter generation (additional requirement)

- Input: reference CV as Markdown at `data/reference-cv.md` (git-ignored), read directly, no parser needed. The other input is a job row.
- Output: per-job tailored CV (2-page international format, states work authorization: "Requires Visa Sponsorship" / "Open to Relocation") and interest letter.
- Mechanism: LLM call (Claude API) with reference CV + job description; output stored in `documents`, rendered to PDF.
- Hard rule in prompt: only reorder/emphasize facts present in reference CV, never invent experience.
- Separate phase; depends on decisions in Open Questions.

## 11. Security

- `/api/cron/scrape` rejects without `Authorization: Bearer $CRON_SECRET` (constant-time compare).
- Secrets only in `.env.local` (git-ignored): `CRON_SECRET`, Google OAuth client id/secret, LLM key.
- Google OAuth tokens stored server-side only. Dashboard has no login (decided), so it must bind to localhost only and never be exposed to a network.
- All SQL parameterized, named columns, no `SELECT *`.

## 12. Decisions and Open Questions

Decided: plain SQL repositories for now (no ORM, revisit if queries get repetitive), Tailwind for UI, LinkedIn scraped (last), contract roles excluded, runs on local machine with system `cron`, no dashboard login, CV work-authorization wording per country, CoL defaults proposed from current public data, no salary threshold yet.

Local cron example: `0 0 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/scrape` (needs the app running; the machine must be on at run time, otherwise missed runs are not retried).

Open: none.
