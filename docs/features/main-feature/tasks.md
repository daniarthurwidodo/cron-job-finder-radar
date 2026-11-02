# Tasks — Expat Job Radar

Legend: `[x]` done, `[ ]` todo. Each phase ends with a checkpoint: stop, review, approve before next phase.
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

## Phase 3 — More scrapers
- [ ] Add headless browser (Playwright) for sources with no public API or JS-rendered pages → verify: one JS-rendered page scraped headless
- [ ] hiredly, trademe → verify: each logs found/inserted counts
- [ ] jobstreet SG/MY, seek NZ, workhere, robert walters → BLOCKED, see `todos.md`
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
- [x] Reference CV `data/reference-cv.md` exists and is git-ignored → verify: `git check-ignore` matches
- [ ] Tailored CV generator, 2-page international format, work-authorization line per country (setting) → verify: PDF is 2 pages
- [ ] ATS-only renderer (single column, standard headings, no tables/images, text layer PDF + DOCX) and ATS validator → verify: validator fails a CV with a table/image/unknown heading; passes the generated CV; extracted PDF text order is correct
- [ ] Interest letter generator → verify: uses only facts from reference CV
- [ ] Store in `documents`, download from job detail → verify: manual check
- [ ] Checkpoint: approve Phase 6
