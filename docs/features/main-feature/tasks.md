# Tasks — Expat Job Radar

Legend: `[x]` done, `[ ]` todo. Each phase ends with a checkpoint: stop, review, approve before next phase.
Design details: `tehnical-solution.md`. Requirements: `prd.md`.

## Phase 0 — Project init
- [x] Scaffold Next.js (TypeScript, App Router, ESLint) → verify: `npm run build` passes
- [x] Add `better-sqlite3` + `lib/db.ts` → verify: query `select sqlite_version()` works
- [x] Ignore `data/*.db` in git
- [x] Resolve Open Questions → answers in `prd.md` section 10 and `memory.md`
- [ ] Confirm reference CV path `data/reference-cv.pdf` (needed before Phase 6)

## Phase 1 — Schema and ingestion core
- [ ] `lib/constants.ts` (statuses, work modes, countries, keyword matrix, limits) → verify: no string/number literals in logic
- [ ] Migration runner + `0001` up/down (tables in tech doc section 8) + seed lookup tables → verify: up, down, up succeeds on empty DB
- [ ] Repositories: jobs, companies, job_sources, scrape_runs → verify: insert/read test
- [ ] Normalizer (title, city, work mode, seniority, salary annual->monthly) → verify: unit tests with sample raw jobs
- [ ] DedupService (`dedup_hash` + normalized URL) → verify: same job twice = one row, second source added to `job_sources`
- [ ] StackMatchService → verify: known description scores expected %
- [ ] FilterService (exclude junior/intern/on-site/contract) → verify: unit tests
- [ ] Cron: add local `crontab` line calling the endpoint (documented, user installs)
- [ ] First scraper: mycareersfuture.gov.sg → verify: run returns jobs, saved, rerun adds 0 duplicates
- [ ] `/api/cron/scrape` with bearer auth → verify: 401 without token, 200 with, `scrape_runs` row written
- [ ] Checkpoint: approve Phase 1

## Phase 2 — Financial engine
- [ ] FX fetcher + `exchange_rates` cache with stale fallback → verify: offline run uses cached rate
- [ ] Verify current tax year rates from official sources, then tax profiles SG, NZ, MY as pure functions (tax year in constants) → verify: tests against official worked examples
- [ ] Research current CoL data for SG, KL, Auckland (cite source + date) and seed `col_benchmarks` → verify: sources recorded; change a benchmark, savings recomputed
- [ ] FinancialService computes `est_*_idr` on ingest, NULL if no salary → verify: unit tests incl. missing salary
- [ ] Priority score (savings, stack, work mode, SG > MY > NZ, MNC) → verify: ordering test
- [ ] Checkpoint: approve Phase 2

## Phase 3 — More scrapers
- [ ] jobstreet SG/MY, hiredly, seek NZ, trademe, workhere → verify: each logs found/inserted counts
- [ ] Relocate.me, Tech in Asia Jobs → verify: same
- [ ] Agencies: Randstad, Michael Page, Robert Walters, Hays, Monroe → verify: same
- [ ] LinkedIn: logged-in scraper, creds/session in `.env.local`, on/off setting → verify: failure does not affect other sources
- [ ] MNC / accredited employer flag on companies → verify: flagged list editable
- [ ] Checkpoint: approve Phase 3

## Phase 4 — Dashboard
- [ ] Install Tailwind CSS → verify: utility class renders on a page
- [ ] Jobs table: filter (country, stack, seniority, status), sort (savings, score), search → verify: manual check in browser
- [ ] Status pipeline (Discovered → … → Rejected/Archived) with Server Action → verify: status persists on reload
- [ ] Compare modal, up to 4 jobs (gross/net IDR, savings, stack overlap, work mode, visa) → verify: manual check
- [ ] Settings page: CoL benchmarks, CV work-authorization wording per country, LinkedIn on/off → verify: edit persists
- [ ] Checkpoint: approve Phase 4

## Phase 5 — Google Calendar
- [ ] Google Cloud project + OAuth credentials (user action) → verify: client id/secret in `.env.local`
- [ ] OAuth flow + token storage → verify: connect/disconnect works
- [ ] Add-to-calendar actions (deadline, HR screen, tech interview) → verify: event appears in Google Calendar and `calendar_events`
- [ ] Show upcoming job events in dashboard (sync) → verify: event created in Google appears in portal
- [ ] Checkpoint: approve Phase 5

## Phase 6 — CV and cover letter
- [ ] Reference CV PDF placed at `data/reference-cv.pdf`; add to `.gitignore` → verify: text extracts from the PDF
- [ ] Tailored CV generator, 2-page international format, work-authorization line per country (setting) → verify: PDF is 2 pages
- [ ] Interest letter generator → verify: uses only facts from reference CV
- [ ] Store in `documents`, download from job detail → verify: manual check
- [ ] Checkpoint: approve Phase 6
