# Product Requirement Document (PRD)

**Project Name:** Expat Job Radar & Financial Comparison Dashboard  
**Status:** Draft / Initial Architecture  
**Target Output:** Personal Daily Automation Tool & Visual Comparison Dashboard  

---

## 1. Executive Summary & Objective

The **Expat Job Radar** is an automated personal job scraper, aggregator, and financial analyzer built using Next.js and SQLite. It executes a daily cron job to search and aggregate expat-friendly tech positions across three target relocation hubs: **Auckland (NZ)**, **Singapore (SG)**, and **Kuala Lumpur (MY)**.

The system normalizes salary offerings, calculates estimated cost of living (CoL) and local tax burdens, and translates net potential savings into **Indonesian Rupiah (IDR)**. It filters and scores opportunities based on work preferences (Full-time, Hybrid, Flexible) and target tech stack match (Node.js, TypeScript, Next.js, NestJS, Dotnet, PHP, WordPress, PostgreSQL, MongoDB, AI/RAG integrations). Additionally, it features direct 2-way Google Calendar integration to manage interview pipelines and application deadlines.

---

## 2. Core Target Criteria & Technical Filters

| Parameter | Preferred Values & Filters | Scoring Weight / Priority |
| :--- | :--- | :--- |
| **Locations** | 1. Auckland, New Zealand<br>2. Singapore<br>3. Kuala Lumpur, Malaysia | Target Destination Set |
| **Work Arrangement** | Full-Time > Hybrid > Flexible Hours | **Highest Priority** (Must filter out strict On-site or Contract if specified) |
| **Seniority Level** | Mid-Level, Senior, Lead / Staff | Exclude Entry, Intern, Junior |
| **Tech Stack Focus** | **Frontend/Fullstack:** Next.js, Angular, TypeScript<br>**Backend:** Node.js, NestJS, .NET (Dotnet), PHP, WordPress<br>**Databases:** PostgreSQL, MongoDB<br>**AI/ML:** AI Integration, RAG (Retrieval-Augmented Generation) | Primary Keyword Matrix for Match Score |
| **Financial Metrics** | Gross Salary, Net Salary (Post-tax), Estimated CoL, **Net Potential Monthly Savings (IDR)** | Primary Sorting Metric |

---

## 3. Key System Features

### 3.1 Daily Cron Job & Scraper Engine
* **Execution Frequency:** Triggers daily at 00:00 UTC via Next.js API route (`/api/cron/scrape`) protected by a secret bearer token or external scheduler (e.g., Vercel Cron, GitHub Actions, or local `cron`).
* **Source Integrations:**
  * **JobStreet API / Web Scraping:** Covers SG, MY.
  * **SEEK API / Web Scraping:** Covers Auckland, NZ.
  * **LinkedIn Jobs API / Custom Parser:** Regional expat roles.
  * **Relocate.me / Tech in Asia:** Expat & visa-sponsored feeds.
* **Deduplication:** Hashing combination of `company_name + job_title + location` to prevent duplicate entries in SQLite.

### 3.2 Tax & Cost of Living (CoL) Calculator Engine
* **Real-Time Exchange Rates:** Fetch daily rates via open currency APIs (`SGD/IDR`, `NZD/IDR`, `MYR/IDR`, `USD/IDR`).
* **Tax Deduction Profiles:**
  * **Singapore:** Progressive resident tax rates (IRAS rates, IRAS EP/COMPASS threshold checks).
  * **New Zealand:** PAYE tax bands + ACC earners' levy.
  * **Malaysia:** Resident vs non-resident tax rates (PCB / MDEC tech worker brackets).
* **Base CoL Benchmarks (Adjustable in Dashboard Settings):**
  * Auckland estimated single expat monthly expenses (Rent + Utilities + Food).
  * Singapore estimated single expat monthly expenses (Rent + Living).
  * Kuala Lumpur estimated single expat monthly expenses (Rent + Living).
* **Formula:**
  $$\text{Net Potential Savings (IDR)} = ((\text{Gross Monthly Salary} - \text{Estimated Monthly Tax}) - \text{Base CoL}) \times \text{Exchange Rate to IDR}$$

### 3.3 Dashboard & Comparative Analytics UI
* **Kanban / Table View:** Filter and sort listings by target relocation city, match score, salary range, and potential IDR savings.
* **Multi-Job Comparison Modal:** Side-by-side comparison matrix showing up to 4 selected jobs, evaluating:
  * Gross vs. Net Salary (IDR)
  * Estimated Monthly Savings (IDR)
  * Tech Stack Overlap %
  * Work flexibility & visa sponsorship status
* **Status Pipeline:** Track states: `Discovered` $\rightarrow$ `Bookmarked` $\rightarrow$ `Applied` $\rightarrow$ `Interviewing` $\rightarrow$ `Offer` $\rightarrow$ `Rejected`.

### 3.4 Google Calendar Integration & Maintenance
* **OAuth 2.0 Integration:** Connect personal Google Account via Google Calendar API.
* **Automatic Event Creation:** Direct "Add to Calendar" action for interview scheduling, follow-ups, and application deadlines.
* **Bi-directional Sync:** View upcoming job-related calendar events directly within the Next.js job management portal.

---

## 4. Technical Architecture & Stack

```
   [ External Job Boards ]  <-- Scraped/Fetched Daily by Next.js Cron
              |
              v
     [ Scraper / Parser ]  --> Normalizes & Scores Roles
              |
              v
  [ Exchange & Tax Engine ] --> Computes Net Savings in IDR
              |
              v
     [ SQLite Database ]   --> Managed via Prisma ORM / Drizzle
              |
              v
    [ Next.js Dashboard ]  <-- Tailored Views, Filters & Side-by-Side Comparison
              |
              +---> [ Google Calendar API Integration ]
```

* **Framework:** Next.js 14+ (App Router, Server Actions, React Server Components)
* **Database:** SQLite (using `better-sqlite3` with **Drizzle ORM** or **Prisma**)
* **UI / Styling:** Tailwind CSS, shadcn/ui components, Lucide Icons, Recharts (for savings/salary breakdown visualizations)
* **Automation:** Next.js Cron Routes / Node-Cron / GitHub Actions
* **Calendar Sync:** `googleapis` NPM package (Google Calendar API v3)

---

## 5. Database Schema (SQLite)

```sql
-- Jobs Table
CREATE TABLE jobs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL, -- 'Auckland', 'Singapore', 'Kuala Lumpur'
    country_code TEXT NOT NULL, -- 'NZ', 'SG', 'MY'
    work_mode TEXT NOT NULL, -- 'Full-time', 'Hybrid', 'Flexible', 'On-site'
    seniority TEXT NOT NULL, -- 'Mid', 'Senior', 'Lead'
    description TEXT,
    apply_url TEXT UNIQUE NOT NULL,
    posted_at DATETIME,
    
    -- Tech Stack Flags
    tech_stack_json TEXT, -- JSON array e.g., ["Next.js", "NestJS", "PostgreSQL", "RAG"]
    stack_match_score INTEGER DEFAULT 0, -- Calculated match percentage
    
    -- Financials in Native Currency
    currency TEXT NOT NULL, -- 'NZD', 'SGD', 'MYR', 'USD'
    salary_min_native REAL,
    salary_max_native REAL,
    
    -- Calculated Financials in IDR
    est_monthly_gross_idr REAL,
    est_monthly_tax_idr REAL,
    est_monthly_col_idr REAL,
    est_net_monthly_savings_idr REAL, -- Primary metric
    
    -- Pipeline Tracking
    status TEXT DEFAULT 'Discovered', -- 'Discovered', 'Bookmarked', 'Applied', 'Interviewing', 'Archived'
    priority_score INTEGER DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Currency Rates Cache Table
CREATE TABLE exchange_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    currency_code TEXT UNIQUE NOT NULL,
    rate_to_idr REAL NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Calendar Events Link Table
CREATE TABLE calendar_events (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    google_event_id TEXT,
    event_type TEXT NOT NULL, -- 'Application Deadline', 'HR Screening', 'Tech Interview'
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    summary TEXT,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);
```

---

## 6. Implementation Roadmap

### Phase 1: Core Setup & Data Ingestion
1. Initialize Next.js 14 project with SQLite and Drizzle/Prisma ORM.
2. Build daily scraper modules tailored to Auckland (SEEK/Workhere), Singapore (JobStreet/LinkedIn), and KL (JobStreet/Hiredly).
3. Implement keyword parsing algorithm for stack match (`Node.js`, `TypeScript`, `Next.js`, `NestJS`, `Dotnet`, `PHP`, `WordPress`, `PostgreSQL`, `MongoDB`, `AI/RAG`).

### Phase 2: Financial Calculation Engine
1. Integrate daily currency converter API for SGD, NZD, MYR to IDR.
2. Build local tax logic profiles for NZ, SG, and MY.
3. Implement adjustable base Cost of Living benchmarks to compute **Net Savings in IDR**.

### Phase 3: Dashboard & Comparison UI
1. Build main table/Kanban pipeline view with filters for location, stack, and seniority.
2. Develop **Side-by-Side Comparison Component** prioritizing highest IDR potential savings and work-style criteria (Full-time > Hybrid > Flexible).
3. Implement responsive sorting and search.

### Phase 4: Google Calendar Integration
1. Set up Google Cloud Console project and configure OAuth 2.0 credentials.
2. Create OAuth authentication flow within Next.js dashboard settings.
3. Add calendar dispatch actions: scheduling interviews, technical assessments, and application follow-ups directly to Google Calendar.

addtional :
- make sure job post is unique
- ready to generate interest letter and generate cv dynamically based by reference cv
- prefer singapore > kl > nz
- use platform :  
  - linkedin (login with gmail account dani.widodo87@gmail.com)
  - ranstad
  - michael page
  - seek
  - trademe.co.nz
  - workhere.co.nz
  - jobstreet.com.sg
  - mycareersfuture.gov.sg
  - robert walters
  - hays
  - hiredly.com
  - Monroe Consulting Group
  - Relocate.me
  - Tech in Asia Jobs
- Target Accredited / MNC Employers
- Resume Formatting: Standardize your CV to a 2-page international format, explicitly noting your work authorization status (e.g., "Requires Visa Sponsorship" or "Open to Relocation").
- 