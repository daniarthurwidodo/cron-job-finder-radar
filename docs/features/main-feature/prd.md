# Product Requirement Document (PRD)

**Project:** Expat Job Radar & Financial Comparison Dashboard
**Status:** Draft
**Owner / User:** Dani Widodo (single user)
**Related docs:** `tehnical-solution.md` (design, schema), `tasks.md` (phased checklist), `memory.md` (decisions)

---

## 1. Summary

Expat Job Radar is a personal tool that every day collects expat-friendly tech jobs in **Singapore, Kuala Lumpur and Auckland**, scores them against my tech stack and work preferences, estimates how much I could save each month **in Indonesian Rupiah (IDR)** after tax and living costs, and lets me track applications and interviews in one dashboard and in Google Calendar. It also produces a tailored CV and interest letter per job.

## 2. Problem and Goals

**Problem:** Relocation job hunting across many boards is manual, repetitive, and hard to compare because salaries come in different currencies, tax systems and living costs.

**Goals**
1. One deduplicated list of relevant jobs, refreshed daily without manual work.
2. Compare any jobs on one metric: estimated net monthly savings in IDR.
3. Track each application from discovery to offer.
4. Cut application effort with a tailored CV and interest letter per job.

**Non-goals (v1)**
- Multi-user accounts, sharing, or a public product.
- Auto-applying to jobs.
- Mobile app (responsive web is enough).
- Immigration/visa legal advice. Visa data is informational only.

## 3. User and Scope

Single user, running the app for personal use. Located in Indonesia, targeting relocation. Needs visa sponsorship or is open to relocation (exact wording: see Open Questions).

## 4. Target Criteria

### 4.1 Locations (preference order)
1. Singapore
2. Kuala Lumpur, Malaysia
3. Auckland, New Zealand

### 4.2 Work arrangement (highest priority)
Full-time > Hybrid > Flexible hours. Strict on-site and contract roles are excluded.

### 4.3 Seniority
Include: Mid, Senior, Lead / Staff. Exclude: Entry, Intern, Junior.

### 4.4 Employers
Prefer accredited employers and MNCs (more likely to sponsor visas and meet pass thresholds).

### 4.5 Tech stack (match keywords)
| Area | Keywords |
| :--- | :--- |
| Frontend / Fullstack | Next.js, Angular, TypeScript |
| Backend | Node.js, NestJS, .NET, PHP, WordPress |
| Databases | PostgreSQL, MongoDB |
| AI | AI integration, RAG |

### 4.6 Primary sort metric
Estimated net potential monthly savings (IDR).

## 5. Functional Requirements

Priority: **P0** required for first usable version, **P1** next, **P2** later.

### 5.1 Daily job collection
| ID | Requirement | Priority |
| :--- | :--- | :--- |
| F1 | A scheduled job runs daily (00:00 UTC) and collects jobs from all configured sources | P0 |
| F2 | The trigger endpoint is protected by a secret token | P0 |
| F3 | A failure in one source does not stop the others; each run records counts and errors | P0 |
| F4 | Jobs are normalized: title, company, city, country, work mode, seniority, salary, currency, description, posted date | P0 |
| F5 | Jobs not matching section 4 filters are dropped before saving | P0 |

**Sources** (in build order, by country preference)

| Region | Sources |
| :--- | :--- |
| Singapore | MyCareersFuture, JobStreet SG |
| Malaysia | Hiredly, JobStreet MY |
| New Zealand | SEEK, Trade Me Jobs, Workhere |
| Global / expat | LinkedIn Jobs, Relocate.me, Tech in Asia Jobs |
| Agencies | Randstad, Michael Page, Robert Walters, Hays, Monroe Consulting Group |

LinkedIn requires login. Automated scraping with a personal account risks a ban and breaks ToS, so the approach is an open decision (section 10). Credentials are never stored in the repo.

### 5.2 Uniqueness
| ID | Requirement | Priority |
| :--- | :--- | :--- |
| U1 | The same job must appear once, even if seen on several sources or on later days | P0 |
| U2 | Duplicate detection uses company + title + city, and the application URL | P0 |
| U3 | When a duplicate is found on another source, the extra source link is kept on the existing job | P1 |

### 5.3 Match and priority score
| ID | Requirement | Priority |
| :--- | :--- | :--- |
| S1 | Each job gets a stack match score (0–100) from section 4.5 keywords | P0 |
| S2 | Each job gets a priority score combining savings, stack match, work mode, country preference, and employer type | P1 |

### 5.4 Salary, tax and cost of living
| ID | Requirement | Priority |
| :--- | :--- | :--- |
| M1 | Salary is converted to monthly gross in its native currency | P0 |
| M2 | Monthly tax is estimated per country: Singapore (IRAS resident rates), New Zealand (PAYE + ACC levy), Malaysia (resident rates) | P0 |
| M3 | A monthly cost-of-living benchmark per city (rent, utilities, food) is applied and editable in settings | P0 |
| M4 | Daily exchange rates SGD, NZD, MYR, USD to IDR are fetched and cached; last known rate is used if fetch fails | P0 |
| M5 | Jobs without a posted salary are still listed, marked "no salary", and have no savings value | P0 |
| M6 | Work-pass eligibility hints (e.g. Singapore EP/COMPASS salary threshold) are shown as flags | P2 |

**Formula**

```
Net Monthly Savings (IDR) = ((Gross Monthly - Monthly Tax) - Monthly CoL) x Exchange Rate to IDR
```

Tax tables carry their tax year and must be verified against official sources. All figures are estimates for comparison, not financial advice.

### 5.5 Dashboard
| ID | Requirement | Priority |
| :--- | :--- | :--- |
| D1 | Table view with filter by country, stack, seniority, status, and sort by savings, match score, priority | P0 |
| D2 | Search by title or company | P0 |
| D3 | Status pipeline: Discovered, Bookmarked, Applied, Interviewing, Offer, Rejected, Archived; status can be changed per job | P0 |
| D4 | Compare up to 4 jobs side by side: gross and net salary (IDR), monthly savings, stack overlap %, work mode, visa sponsorship | P1 |
| D5 | Kanban view of the pipeline | P2 |
| D6 | Settings page for CoL benchmarks | P1 |
| D7 | Charts of salary and savings breakdown | P2 |

### 5.6 Google Calendar
| ID | Requirement | Priority |
| :--- | :--- | :--- |
| C1 | Connect a Google account with OAuth 2.0 | P1 |
| C2 | "Add to calendar" for application deadline, HR screening, technical interview | P1 |
| C3 | Show upcoming job-related events in the dashboard | P2 |

### 5.7 CV and interest letter
| ID | Requirement | Priority |
| :--- | :--- | :--- |
| G1 | Generate a tailored CV for a job from a reference CV I provide | P1 |
| G2 | CV uses a standard 2-page international format and states work authorization status ("Requires Visa Sponsorship" or "Open to Relocation") | P1 |
| G3 | Generate an interest (cover) letter for a job from the reference CV and job description | P1 |
| G4 | Generated content may only reorder or emphasize facts already in the reference CV; it must never invent experience | P1 |
| G5 | Generated documents are saved per job and downloadable | P1 |
| G6 | Every generated CV is always rendered in ATS (applicant tracking system) friendly format, see rules below. No option to turn this off | P1 |

**ATS CV rules (always applied)**
1. Single column, no tables, text boxes, columns, headers/footers holding content, images, icons, charts or skill-bar graphics.
2. Standard section headings only: Summary, Work Experience, Education, Skills, Certifications.
3. Reverse-chronological work history. Each role: job title, company, location, `Mon YYYY - Mon YYYY` dates.
4. Plain bullet characters only. Standard fonts (Arial, Calibri or Times New Roman), body 10-12 pt, no colored text for meaning.
5. Contact details as plain text in the body (not in a header/footer): name, email, phone, city and country, LinkedIn URL.
6. Real, selectable text in the output file (no scanned image). Output as PDF with text layer, plus DOCX.
7. Skills section is a plain comma-separated list that uses the job posting's exact keyword spelling (for example "Node.js", "PostgreSQL") only for skills already in the reference CV.
8. Work-authorization line in plain text under the contact details.
9. File name `Firstname-Lastname-CV-Company.pdf`, no spaces or special characters.
10. 2 pages maximum.

## 6. Non-Functional Requirements
- **Reliability:** a daily run completes even if some sources fail; errors are visible per run.
- **Politeness:** respect robots.txt and rate-limit requests to each source.
- **Security:** secrets only in environment files, never committed; cron endpoint authenticated; OAuth tokens stored server-side only.
- **Data:** SQLite file stored locally; rebuildable from a fresh scrape except my pipeline status, notes and generated documents (these should be backed up).
- **Performance:** dashboard list loads in under 1 second for up to 10,000 jobs.
- **Accuracy:** tax and CoL are clearly labelled as estimates, with tax year and rate age shown.

## 7. Success Metrics
- Daily run succeeds on at least 90% of days with at least one source.
- Zero duplicate jobs in the list.
- At least 80% of listed jobs have a stack match score above 0 and meet the filters.
- Time from "found a job" to "tailored CV and letter ready" under 5 minutes.

## 8. Architecture Overview

```
[ Job sources ] -> [ Scrapers ] -> [ Normalize, dedupe, filter, score ]
                                             |
                                             v
                                [ Tax + CoL + FX engine ] -> IDR savings
                                             |
                                             v
                                       [ SQLite ]
                                             |
                          +------------------+------------------+
                          v                  v                  v
                    [ Dashboard ]   [ Google Calendar ]   [ CV / letter generator ]
```

Stack: Next.js (App Router, TypeScript), SQLite (`better-sqlite3`), `googleapis` for Calendar. Detailed design, database schema and deviations from the earlier draft are in `tehnical-solution.md`.

## 9. Roadmap

| Phase | Outcome |
| :--- | :--- |
| 1. Schema and ingestion | First source (MyCareersFuture) saved daily, deduplicated, filtered, scored |
| 2. Financial engine | IDR net savings per job with FX, tax, CoL |
| 3. More sources | All sources in 5.1 (LinkedIn per decision) |
| 4. Dashboard | Table, filters, pipeline, compare, settings |
| 5. Google Calendar | OAuth and event actions |
| 6. CV and letter | Tailored documents per job |

Each phase ends with a review checkpoint. Task-level breakdown: `tasks.md`.

## 10. Decisions and Open Questions

**Decided (2026-11-02)**
| Topic | Decision |
| :--- | :--- |
| LinkedIn | Scrape with logged-in session. Accepted risk: ToS violation, possible account restriction. Credentials/session only in `.env.local`, never committed. Built last, low request rate, can be switched off without affecting other sources |
| Contract roles | Excluded completely |
| Hosting | Local machine, system `cron` triggers the endpoint |
| Dashboard login | None (local only; app must not be exposed to the network) |
| UI | Tailwind CSS |
| CV work authorization wording | Per country (setting per SG / MY / NZ) |
| Cost-of-living benchmarks | Propose defaults from current public data (researched in Phase 2, shown with source and date, editable) |
| Minimum salary / savings threshold | None for now; add later if the list is too noisy |
| Reference CV format | Markdown, converted from the Word CV (`docs/Curriculum Vitae Dani Arthur Widodo.docx`). Location `data/reference-cv.md` (git-ignored, contains personal data) |

**Still open**
None.
