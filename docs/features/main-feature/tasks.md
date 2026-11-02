# Tasks — Expat Job Radar

Legend: `[x]` done, `[ ]` todo, `[-]` skipped by user. Each phase ends with a checkpoint: stop, review, approve before next phase.
Design details: `tehnical-solution.md`. Requirements: `prd.md`. Blockers and open risks: `todos.md`.

## Phase 0 — Project init
- [x] Scaffold Next.js (TypeScript, App Router, ESLint) → verify: `npm run build` passes
- [x] Add `better-sqlite3` + `lib/db.ts` → verify: query `select sqlite_version()` works
- [x] Ignore `data/*.db` in git
- [x] Resolve Open Questions → answers in `prd.md` section 10 and `memory.md`
- [x] Reference CV at `data/reference-cv.md` (git-ignored)

## Phase 1 — Schema and ingestion core
- [x] `lib/constants.ts` (statuses, work modes, countries, keyword matrix, limits) → verify: no string/number literals in logic
- [x] Migration runner + `0001` up/down (tables in tech doc section 8) + seed lookup tables → verify: up, down, up succeeds on empty DB
- [x] Repositories: jobs, companies, job_sources, scrape_runs → verify: insert/read test
- [x] Normalizer (title, city, work mode, seniority, salary annual->monthly) → verify: unit tests with sample raw jobs
- [x] DedupService (`dedup_hash` + normalized URL) → verify: same job twice = one row, second source added to `job_sources`
- [x] StackMatchService → verify: known description scores expected %
- [x] FilterService (exclude junior/intern/on-site/contract) → verify: unit tests
- [x] Scheduling: systemd user timer + installer in `deploy/` (replaces cron, CachyOS) → user runs `deploy/install-systemd.sh` on the CachyOS machine
- [x] First scraper: mycareersfuture.gov.sg → verify: run returns jobs, saved, rerun adds 0 duplicates
- [x] `/api/cron/scrape` with bearer auth → verify: 401 without token, 200 with, `scrape_runs` row written
- [ ] Checkpoint: approve Phase 1 (waiting for user review)

## Phase 2 — Financial engine
- [x] FX fetcher + `exchange_rates` cache with stale fallback → verify: offline run uses cached rate
- [x] Verify current tax year rates from official sources, then tax profiles SG, NZ, MY as pure functions (tax year in constants) → verify: tests against official worked examples
- [x] Research current CoL data for SG, KL, Auckland (cite source + date) and seed `col_benchmarks` → verify: sources recorded; change a benchmark, savings recomputed
- [x] FinancialService computes `est_*_idr` on ingest, NULL if no salary → verify: unit tests incl. missing salary
- [x] Priority score (savings, stack, work mode, SG > MY > NZ, MNC) → verify: ordering test
- [ ] Checkpoint: approve Phase 2 (waiting for user review)

## Cross-cutting — CachyOS / Arch
- [x] Linux compatibility review: import case, paths, engines, systemd timer, install steps in tech doc section 11a
- [ ] First install on CachyOS: `npm ci && npm run build && deploy/install-systemd.sh` → verify: `systemctl --user list-timers radar-scrape.timer` shows next run; `npm test` passes there
- [ ] Phase 3 headless browser uses system Chromium on Arch (`executablePath`)

## Rule changes after Phase 3 approval
- [x] Role-type filter: fullstack, frontend, web developer, React Native, AI engineer (title match) → verified: unit tests for accepted and rejected titles; existing 565 non-matching saved jobs soft-deleted (203 left)

## Phase 3 — More scrapers
- [x] Add headless browser (`playwright-core` + system Chrome/Chromium, stops on bot checks) → verified on Michael Page SG
- [-] hiredly, trademe → SKIPPED by user (2026-11-02)
- [ ] jobstreet SG/MY, seek NZ, workhere, robert walters → BLOCKED, see `todos.md`
- [-] Relocate.me, Tech in Asia Jobs → SKIPPED by user
- [x] Michael Page SG → verified live (194 found, 31 saved)
- [-] Agencies: Randstad, Hays, Monroe → SKIPPED by user
- [ ] Robert Walters → BLOCKED (bot check), see `todos.md`
- [-] LinkedIn → SKIPPED by user (no credentials supplied)
- [-] MNC / accredited employer flag → deferred to Phase 4 settings page (column `is_mnc` exists, nothing sets it yet)
- [ ] Checkpoint: approve Phase 3 (waiting for user review). Sources live: MyCareersFuture, Michael Page SG

## Phase 4 — Dashboard
- [x] Install Tailwind CSS → verify: utility class renders on a page
- [x] Daily scrape activity panel (PRD D8): latest run + per-day history per source (found / new / duplicates / filtered / invalid / error), "New today" list sorted by priority → verify: after a run the panel matches `scrape_runs`; a source with an error shows its message
- [x] Daily visibility rule (PRD D9): main list = jobs first saved on the latest run day + all tracked-status jobs; older untracked jobs hidden → verify: a job saved yesterday and untouched is absent; the same job after Bookmark is present; a missed run day does not empty the list; jobs from both MyCareersFuture and Michael Page appear under the same rule; one failing source does not hide the others
- [x] History view by day (PRD D10) → verify: picking yesterday shows only yesterday's new jobs
- [x] Jobs table paginated, 50 per page, filters kept across pages → verify: 103 jobs = 3 pages (50/50/3); page beyond last shows the last page
- [x] Jobs table: filter (country, stack, seniority, status), sort (savings, score), search → verify: manual check in browser
- [x] Status pipeline (Discovered → … → Rejected/Archived) with Server Action → verify: status persists on reload
- [x] Compare modal, up to 4 jobs (gross/net IDR, savings, stack overlap, work mode, visa) → verify: manual check
- [x] Settings page: CoL benchmarks → verified by test (edit recomputes savings). CV work-authorization wording per country moves to Phase 6; LinkedIn on/off dropped (LinkedIn skipped)
- [x] Checkpoint: Phase 4 approved by user (2026-11-02)

## Phase 5 — Google Calendar (SKIPPED by user 2026-11-02, OAuth not wanted)
- [-] Google Cloud project + OAuth credentials (user action) → verify: client id/secret in `.env.local`
- [-] OAuth flow + token storage → verify: connect/disconnect works
- [-] Add-to-calendar actions (deadline, HR screen, tech interview) → verify: event appears in Google Calendar and `calendar_events`
- [-] Show upcoming job events in dashboard (sync) → verify: event created in Google appears in portal
- [-] Checkpoint: approve Phase 5

## Phase 6 — CV and cover letter
- [x] Reference CV `data/reference-cv.md` exists and is git-ignored → verify: `git check-ignore` matches
- [x] Tailored CV generator, 2-page international format, work-authorization line per country (setting) → verify: PDF is 2 pages
- [x] ATS-only renderer (single column, standard headings, no tables/images, text layer PDF; DOCX deferred, see todos.md) and ATS validator → verify: validator fails a CV with a table/image/unknown heading; passes the generated CV; extracted PDF text order is correct
- [x] Interest letter generator → verify: uses only facts from reference CV
- [x] Store in `documents`, download from job detail → verify: manual check
- [ ] Checkpoint: approve Phase 6 (waiting for user review)

## Phase 7 — Assisted apply queue (depends on Phase 6)
- [ ] Migration `0004`: `jobs.apply_queued_at` (+ decide how Skipped is stored) → verify: up, down, up
- [ ] Queue / unqueue action and Apply queue page with states (Needs documents, Ready, Applied, Skipped) → verify: queue a job, it appears; unqueue, it disappears; default is not queued
- [ ] Generate documents for queued job on demand (reuses Phase 6) → verify: documents attached, state becomes Ready
- [ ] "Start apply": headed browser opens apply page, pre-fills what the site adapter supports, stops → verify: manual run on one MyCareersFuture job and one Michael Page job; app never clicks submit
- [ ] "I applied" confirmation moves job to Applied with date → verify: status and date persist
- [ ] Checkpoint: approve Phase 7
