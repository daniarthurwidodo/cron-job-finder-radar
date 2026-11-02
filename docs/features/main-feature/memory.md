# Memory — Expat Job Radar

Short, durable facts and decisions. Append new ones with date.

## Decisions
- 2026-11-02: Stack = Next.js (TS, App Router, no Tailwind yet) + `better-sqlite3`. Chosen as defaults, docs had no preference.
- 2026-11-02: Country preference is SG > MY > NZ (PRD "additional" overrides PRD table order).
- 2026-11-02: Schema follows constitution R19 (no FK/cascade/CHECK, integer money, lookup tables) instead of the PRD sample SQL. See `tehnical-solution.md` section 9.
- 2026-11-02: Primary sort metric = estimated net monthly savings in IDR.

## Constraints
- Work mode priority: Full-time > Hybrid > Flexible.
- Exclude Entry/Intern/Junior. Target Mid/Senior/Lead.
- Target MNC / accredited employers.
- CV: 2-page international format, state work authorization. Always rendered in ATS format (single column, standard headings, no tables/images, text-layer PDF + DOCX). Rule list in prd.md section 5.7.
- Job posts must be unique across sources.
- Do not commit LinkedIn credentials anywhere.

## More decisions
- 2026-11-02: LinkedIn scraped with logged-in session (risk accepted), built last, creds in `.env.local` only.
- 2026-11-02: Contract roles excluded. Runs on local machine with system cron. No dashboard login (localhost only). Tailwind for UI.
- 2026-11-02: CV work-authorization wording is a per-country setting. CoL defaults researched from current public data in Phase 2. No salary threshold yet.
- 2026-11-02: Plain SQL repositories, no ORM for now.

- 2026-11-02: Reference CV is Markdown at `data/reference-cv.md` (git-ignored), converted from the docx.

- 2026-11-02: Scrapers without a public API run in a headless browser (Playwright, Phase 3). MCF uses plain fetch.
- 2026-11-02: Tool never creates accounts or enters passwords; user registers sites and puts credentials in `.env.local`.
- 2026-11-02: Phase 1 done. First live MCF run: 1767 found, 737 saved, rerun saved 0 new. Seniority "entry", contract/temporary, on-site-only and zero stack match are filtered.
- 2026-11-02: Part-time roles are not filtered (only contract/temporary/internship). Unknown seniority defaults to mid. Work mode inferred from description (MCF has no field).

- 2026-11-02: Missing salary is OK. Never filter on it; priority score ignores the savings weight when salary is unknown.

- 2026-11-02: Runs on CachyOS (Arch). Scheduling = systemd user timer (`deploy/`), Persistent=true. Playwright must use system Chromium. Linux install untested until first run there.
- 2026-11-02: Phase 2 done. Savings = (min monthly gross - tax - CoL) x FX. SG no CPF (EP holder), MY resident bands + RM9,000 relief + RM400 rebate, NZ 2025-26 bands + 2026-27 ACC (2026-27 bands unconfirmed). CoL defaults are rough, from conflicting sources, editable. Priority weights: savings 40, stack 25, country 15, work mode 10, employer 10.
- 2026-11-02: Monthly salary above 100,000 is treated as annual (employer data-entry error). Rows saved before this rule keep their old salary until the DB is rebuilt.

- 2026-11-02: Blocked sources (bot check): JobStreet SG/MY, SEEK NZ, Robert Walters. Workhere down until early 2027. Never bypass bot checks. Tracked in `todos.md`.

- 2026-11-02: User skipped remaining scrapers (Hiredly, Trade Me, Hays, Randstad, Monroe, Relocate.me, Tech in Asia, LinkedIn) and manual import. Live sources: MyCareersFuture + Michael Page SG.

- 2026-11-02: Dashboard daily rule: main list = jobs first saved on the latest run day + jobs in tracked statuses (bookmarked/applied/interviewing/offer). Older untracked jobs are hidden, not deleted. Day = latest run date. Applies to all job boards with one shared rule.

- 2026-11-02: Auto-apply = ASSISTED apply (user chose). App collects only; user queues a job; app prepares ATS CV + letter, opens a headed browser, pre-fills, STOPS; user clicks Submit. Never auto-submit, never bypass login/CAPTCHA. Phase 7, after Phase 6.

- 2026-11-02: Phase 4 dashboard built: / (scrape panel, daily rule, filters, 50/page, status change), /compare (max 4), /settings (CoL). Kanban (D5) and charts (D7) not built (P2). Verified with 51 tests, HTTP checks on real data, and a headless-Chrome click-through of status change + compare.

- 2026-11-02: Role filter (title): fullstack, frontend, web developer, React Native, AI engineer/developer only. Generic "Software Engineer" is excluded. 565 old saved jobs soft-deleted.

- 2026-11-02: Phase 4 approved. Phase 5 (Google Calendar / OAuth) SKIPPED. Next: Phase 6 (CV + letter), then Phase 7 (assisted apply).

- 2026-11-02: Phase 6 built with templates (no AI). Verified live on a real job: 2-page ATS PDF with text layer, letter, per-country work-authorization line (editable in Settings). DOCX deferred.

- 2026-11-02: Phase 7 built: queue (opt-in per job), Apply queue page, Start apply (visible browser, pre-fill Michael Page only, never submits, no action on login pages), I applied / Skip / Remove. All phases except skipped ones (3 partly, 5) now built.

## Open questions
- None.

## Doc files
- `prd.md` requirements and decisions, `tehnical-solution.md` design, `tasks.md` phased checklist.
