# Todos and Blockers

Last updated: 2026-11-02. Open items that are not part of the normal phase checklist (`tasks.md`). Move an item to "Resolved" when done.

## Blocked job sources

| Source | Country | Status | Evidence | Options to unblock |
| :--- | :--- | :--- | :--- | :--- |
| JobStreet SG | SG | **Blocked** (bot check) | Plain HTTP: 403. Headless Chrome: Cloudflare page "Just a moment... Performing security verification" | 1) Manual import (email job alerts or saved-search export). 2) Official partner/API access if JobStreet offers one. Bypassing the check is not allowed (see policy below) |
| JobStreet MY | MY | **Blocked** (bot check) | Same as above | Same as above |
| SEEK | NZ | **Blocked** (bot check) | Plain HTTP: 403. Headless Chrome: same Cloudflare page. SEEK and JobStreet share one platform | Same as above. Use Trade Me for NZ coverage meanwhile |
| Robert Walters | SG | **Blocked** (bot check) | Plain HTTP: 403. Headless Chrome: "Access to this page has been denied ... automation tools" | Same as above. Check whether they publish an RSS/job feed |
| Workhere | NZ | **Site down** | Home page: "Workhere is building something - and we'll return early 2027" | Re-check after early 2027. Use Trade Me meanwhile |
| LinkedIn | all | **Waiting on user** | No `LINKEDIN_EMAIL` / `LINKEDIN_PASSWORD` in `.env.local`. Tool never creates accounts or types passwords. ToS and ban risk accepted by user | User puts credentials in `.env.local`; then build Phase 3 LinkedIn scraper (last, behind on/off setting). Stop if a verification/CAPTCHA appears |

Built and verified live: MyCareersFuture (API), Michael Page SG (headless browser: 194 found, 31 saved on first run, most filtered for no stack keyword because list summaries are short).

Skipped by user decision (2026-11-02), not built: Hiredly MY, Trade Me NZ, Hays SG, Randstad SG, Monroe, Relocate.me, Tech in Asia, LinkedIn. Manual import for blocked boards: also skipped. Reachable when wanted later: Hays SG, Randstad SG (search "node.js" returned 0 results, needs wider query), Hiredly MY, Trade Me NZ, Relocate.me, Tech in Asia, Monroe Consulting.

## Role filter caveat
Title-only match drops generic titles ("Software Engineer", "Senior Software Developer", "Dot Net Developer") even when the description is full stack. On the first 768 saved jobs this kept 203. If the list feels too thin, options: also accept generic software titles whose description mentions web / React / Angular / Next.js, or add more title words (for example "UI engineer", "Angular developer").

## Policy for bot checks
Scrapers use plain headless Chrome with default identity. If a page shows a bot check, CAPTCHA, or "automation detected" page, the scraper stops with `BotChallengeError`, records it in `scrape_runs.error_message`, and the source is listed above. No stealth plugins, UA spoofing, proxy rotation, or CAPTCHA solving.

## Open technical blockers and risks

| Item | Impact | Next step |
| :--- | :--- | :--- |
| NZ 2026-27 income tax bands unconfirmed (Bill introduced 2026-09-10) | NZ savings use 2025-26 bands | Re-check IRD tax rates page once the Bill is enacted; update `NZ_TAX_BANDS` |
| Malaysia YA 2026 bands assumed same as YA 2023-2025 | MY tax may be slightly off | Check LHDN YA 2026 table when published |
| Cost-of-living defaults are rough (sources conflict, Numbeo not directly readable) | Savings numbers for all jobs shift with them | User reviews and edits `col_benchmarks` (settings page in Phase 4) |
| Michael Page does not name the employer | Company shown as "Michael Page (client undisclosed)"; dedup across sources weak; MNC flag impossible | Accept for now; match by title + location only |
| Michael Page / agency list pages carry short summaries only | Stack match score may be low or 0 and the job gets filtered | Fetch detail pages for jobs whose list text is short (later) |
| systemd units and `install-systemd.sh` never run on CachyOS | Daily schedule unverified | First install on CachyOS, run `systemctl --user list-timers radar-scrape.timer` |
| Playwright on Arch uses system Chromium (`/usr/bin/chromium`), untested | Browser scrapers may fail on first Linux run | `sudo pacman -S chromium`; set `CHROME_EXECUTABLE_PATH` if installed elsewhere |
| 3 jobs saved before the salary plausibility rule keep an annual figure as monthly | Inflated savings for 3 rows | Delete `data/app.db` and rescrape, or ignore (dev data) |
| `.docx` CV in `docs/` is not git-ignored and holds contact details | Personal data could be committed | Move to `data/` or add to `.gitignore` |
| CV says "over 8 years"; LinkedIn and CV dates differ (titles, Allianz end date, etc.) | Generated CV repeats whichever source is used | User picks the correct version, then update `data/reference-cv.md` |

## Assisted apply (Phase 7) risks
| Item | Note |
| :--- | :--- |
| Depends on Phase 6 CV + letter generation | Not started; apply queue is useless without it |
| MyCareersFuture apply needs Singpass login | User logs in inside the opened window; app cannot and will not automate it |
| Blocked boards (JobStreet, SEEK, Robert Walters) | Automation cannot open them; "Start apply" only opens the link in the user's normal browser |
| Site form changes break adapters | One adapter per source, fails safe by just opening the page |

## Resolved
- Reference CV format and location (Markdown, `data/reference-cv.md`).
- Dashboard login, hosting, LinkedIn approach, contract roles, UI kit (see `memory.md`).
