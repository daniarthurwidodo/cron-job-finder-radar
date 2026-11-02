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

Browser engine: sources with a public API (MyCareersFuture) use plain `fetch`. Sources with no API or JS-rendered pages (LinkedIn, SEEK, JobStreet and similar) run in a headless browser (Playwright, added in Phase 3 when the first such scraper is built). Logins (LinkedIn) happen inside the headless session using credentials from `.env.local`; accounts are created and passwords chosen by the user, never by the tool.

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

- Salary normalization: annual -> monthly (/12), hourly/daily rejected unless convertible; missing salary is normal (most postings hide it): job is never filtered for it, savings = NULL, flagged "salary not disclosed", priority score drops the savings weight instead of scoring it as zero, savings sort puts NULL last.
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

Daily visibility rule (PRD D9): the list query is `jobs WHERE deleted_at IS NULL AND (date(created_at) = <latest run day> OR status IN (bookmarked, applied, interviewing, offer))`; rejected/archived excluded. `<latest run day>` = date of the latest finished `scrape_runs.started_at`. Both are computed in a service from `jobs.created_at` (ISO date, UTC) with the displayed day shown in the user's timezone; add an index on `jobs.created_at` when the dashboard is built. The query has no source filter, so the rule covers every board; "latest run day" is the newest finished run across all sources. Nothing is deleted: old jobs stay in the DB and the history view (D10) reads them.

Dashboard scrape panel (PRD D8) reads existing data, no new tables: per-day per-source rows from `scrape_runs` (`started_at`, counts, `error_message`), "new today" = jobs whose `created_at` is on/after the latest successful run start, joined to companies/countries, ordered by `priority_score DESC`. Read goes through a service (presentation never calls repositories).

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
- **ATS format is mandatory** (PRD G6): the renderer has one layout only, so non-ATS output is not possible. Layout: single column, plain text blocks, standard headings, no images/tables. Rules are encoded as constants plus a validator that runs on the generated Markdown/PDF text and fails generation if it finds a table, image, unknown heading, missing contact line, missing work-authorization line, or more than 2 pages.
- Render path: generated Markdown -> single-column HTML/CSS template -> PDF with text layer (and DOCX). Library choice in Phase 6.
- Separate phase; depends on decisions in Open Questions.

## 10a. Apply queue (assisted apply)

- Data: `jobs.apply_queued_at TEXT NULL` (NULL = not queued) via migration `0003`; applied/skipped use the existing status pipeline plus a `Skipped` handling decision (reuse `archived` with a note, or add lookup row; decide at build time). Documents live in `documents` (Phase 6).
- Flow: user queues job -> service ensures CV + letter exist (generate if missing) -> "Start apply" server action launches a **headed** (visible) browser via the shared `withBrowserPage` helper with `headless: false` -> adapter per site fills fields -> returns control; the page stays open for the user. App has no code path that clicks the final submit.
- Adapters: one small function per source (`mycareersfuture`, `michaelpage_sg`) that maps CV fields to that site's form; unknown sites just open the URL.
- Safety: a bot check or login wall is not handled by the app; the window stays open for the user. No application-site credentials are stored. Server action requires the explicit job id and only acts on queued jobs.
- Depends on Phase 6 (CV + letter generation). Not started.

## 11. Security

- `/api/cron/scrape` rejects without `Authorization: Bearer $CRON_SECRET` (constant-time compare).
- `npm run dev` and `npm start` bind to 127.0.0.1 only (no dashboard login, so no network exposure).
- Secrets only in `.env.local` (git-ignored): `CRON_SECRET`, Google OAuth client id/secret, LLM key.
- Google OAuth tokens stored server-side only. Dashboard has no login (decided), so it must bind to localhost only and never be exposed to a network.
- All SQL parameterized, named columns, no `SELECT *`.

## 11a. Platform: CachyOS / Arch Linux

Target runtime is CachyOS (Arch-based, systemd). Dev happens on macOS, so these are the differences to respect:
- Install: `sudo pacman -S --needed nodejs npm base-devel python curl git`, then `npm ci`. `better-sqlite3` ships prebuilt Linux x64 (glibc) binaries; `base-devel` + `python` are only needed if npm falls back to compiling it. Node must be >= 20.9 (`engines` in package.json); Arch `nodejs` is current.
- File system is case-sensitive: every `@/...` import was checked against exact on-disk filename case (0 mismatches). Keep camelCase file names and matching imports.
- No cron on Arch by default: use the systemd timer in `deploy/`. For it to run while logged out: `sudo loginctl enable-linger $USER`. If npm comes from nvm/fnm, `command -v npm` at install time is baked into the unit.
- Paths: code uses `path.join` + `process.cwd()` (no hard-coded separators). DB is `data/app.db`; the service sets `WorkingDirectory` to the repo, so the path is correct.
- Headless browser (Phase 3): Playwright's bundled browsers are built for Ubuntu/Debian and are unsupported on Arch. Plan: install system Chromium (`sudo pacman -S chromium`) and launch Playwright with `executablePath: /usr/bin/chromium`, instead of `npx playwright install`.
- Status: the unit files and installer were written on macOS and are not yet run on CachyOS (only `bash -n` syntax-checked). First run there is the real test.

## 12. Decisions and Open Questions

Decided: plain SQL repositories for now (no ORM, revisit if queries get repetitive), Tailwind for UI, LinkedIn scraped (last), contract roles excluded, runs on local machine with system `cron`, no dashboard login, CV work-authorization wording per country, CoL defaults proposed from current public data, no salary threshold yet.

Scheduling on CachyOS / Arch (systemd user timer, replaces cron): `deploy/install-systemd.sh` installs `radar-web.service` (runs `npm start` on 127.0.0.1:3000) and `radar-scrape.timer` (daily 00:00 UTC, `Persistent=true` so a run missed while the machine was off or asleep is executed at next boot/wake). The scrape service calls the endpoint with `CRON_SECRET` read from `.env.local`.

Open: none.
