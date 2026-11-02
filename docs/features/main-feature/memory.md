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

## Open questions
- None.

## Doc files
- `prd.md` requirements and decisions, `tehnical-solution.md` design, `tasks.md` phased checklist.
