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
- [x] Checkpoint: Phase 1 approved by user (2026-11-02)

## Phase 2 — Financial engine
- [x] FX fetcher + `exchange_rates` cache with stale fallback → verify: offline run uses cached rate
- [x] Verify current tax year rates from official sources, then tax profiles SG, NZ, MY as pure functions (tax year in constants) → verify: tests against official worked examples
- [x] Research current CoL data for SG, KL, Auckland (cite source + date) and seed `col_benchmarks` → verify: sources recorded; change a benchmark, savings recomputed
- [x] FinancialService computes `est_*_idr` on ingest, NULL if no salary → verify: unit tests incl. missing salary
- [x] Priority score (savings, stack, work mode, SG > MY > NZ, MNC) → verify: ordering test
- [x] Checkpoint: Phase 2 approved by user (2026-11-02)

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
- [x] Checkpoint: Phase 3 approved by user (2026-11-02). Sources live: MyCareersFuture, Michael Page SG

## Phase 4 — Dashboard
- [x] Install Tailwind CSS → verify: utility class renders on a page
- [x] Daily scrape activity panel (PRD D8): latest run + per-day history per source (found / new / duplicates / filtered / invalid / error), "New today" list sorted by priority → verify: after a run the panel matches `scrape_runs`; a source with an error shows its message
- [x] Daily visibility rule (PRD D9): main list = jobs first saved on the latest run day + all tracked-status jobs; older untracked jobs hidden → verify: a job saved yesterday and untouched is absent; the same job after Bookmark is present; a missed run day does not empty the list; jobs from both MyCareersFuture and Michael Page appear under the same rule; one failing source does not hide the others
- [x] History view by day (PRD D10) → verify: picking yesterday shows only yesterday's new jobs
- [x] Header column filters (job, country, work mode, level, salary, min savings / stack / priority, status) in one GET form with sort and day → verified: unit tests for each filter and bad input; headless Chrome click-through (203 jobs to 15, values kept, filter row stays visible with no results)
- [x] Sort direction (ascending / descending) next to Sort; salary-less jobs last in both directions → verified: unit test for both directions and filter parsing; browser check on real data, direction kept across pages
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
- [x] Checkpoint: Phase 6 approved by user (2026-11-02)

## Phase 7 — Assisted apply queue (depends on Phase 6)
- [x] Migration `0004`: `jobs.apply_queued_at` (+ decide how Skipped is stored) → verify: up, down, up
- [x] Queue / unqueue action and Apply queue page with states (Needs documents, Ready, Applied, Skipped) → verify: queue a job, it appears; unqueue, it disappears; default is not queued
- [x] Generate documents for queued job on demand (reuses Phase 6) → verify: documents attached, state becomes Ready
- [x] "Start apply": headed browser opens apply page, pre-fills what the site adapter supports, stops → verified on a local fixture form (fills fields, uploads CV, never clicks submit, does nothing on a login page) and read-only detection on a real Michael Page job page. NOT yet run live with a visible window and a real form: user to try one
- [x] "I applied" confirmation moves job to Applied with date → verify: status and date persist
- [x] Checkpoint: Phase 7 approved by user (2026-11-02)

## Phase 8 — Email check, Gmail read-only (approved 2026-11-02; built; only the real Google connection is waiting on user credentials)
Waiting on the user (does not block the code): Google Cloud project, Gmail API enabled, OAuth client, `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env.local`. See `todos.md`.
- [x] Migration `0005`: `google_connections`, `job_emails`, `email_sync_runs` → verify: up, down, up
- [x] Constants: categories, keyword rules, category -> suggested status map, match thresholds → verify: no literals in logic
- [x] OAuth start/callback routes with PKCE + state, token saved, Disconnect deletes it → verified: unit tests for URL (read-only scope, S256, state) and state checks; live HTTP checks with fake test values (302 to Google, bad state / no cookies / denied all land on Settings); real connect NOT done: needs user credentials
- [x] `GmailClient` (list + metadata get, snippet only) with fake in tests → verified: header/snippet parsing tested; real Gmail calls NOT run live (no credentials); 401 and revoked token give a "reconnect" error
- [x] `EmailCategoryService` → verify: tests for interview, assessment, offer, rejection, received, other, including a phishing-style email that contains instructions (must be ignored)
- [x] `EmailMatchService` → verify: tests for company/domain match, title match, agency reference match, below-threshold dropped, only candidate jobs considered
- [x] Sync service: fetch, match, store (idempotent on `gmail_message_id`), `email_sync_runs` row → verify: running twice stores no duplicates
- [x] Settings: Connect / Disconnect / Sync now with status → verified: shows "Not configured" without credentials and "Connect Google" with them; Sync/Disconnect forms need a real connection
- [x] Job page "Emails" section with Confirm status / Dismiss for suggestions → verify: confirm changes status; dismiss hides; nothing changes without a click
- [x] Home "Email updates" panel → verify: shows last sync, new matches, pending suggestions, errors
- [x] Daily run calls sync when connected, failure never blocks the scrape → verify: test with a failing client
- [x] Checkpoint: Phase 8 approved by user (2026-11-02)

