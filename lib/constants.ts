export const COUNTRY_CODES = {
  SINGAPORE: "SG",
  MALAYSIA: "MY",
  NEW_ZEALAND: "NZ",
} as const;

export const COUNTRY_CURRENCIES = {
  [COUNTRY_CODES.SINGAPORE]: "SGD",
  [COUNTRY_CODES.MALAYSIA]: "MYR",
  [COUNTRY_CODES.NEW_ZEALAND]: "NZD",
} as const;

export const COUNTRY_PRIMARY_CITIES = {
  [COUNTRY_CODES.SINGAPORE]: "Singapore",
  [COUNTRY_CODES.MALAYSIA]: "Kuala Lumpur",
  [COUNTRY_CODES.NEW_ZEALAND]: "Auckland",
} as const;

export const WORK_MODES = {
  FULL_TIME: "full_time",
  HYBRID: "hybrid",
  FLEXIBLE: "flexible",
  ON_SITE: "on_site",
} as const;

export const SENIORITIES = {
  ENTRY: "entry",
  MID: "mid",
  SENIOR: "senior",
  LEAD: "lead",
} as const;

export const JOB_STATUSES = {
  DISCOVERED: "discovered",
  BOOKMARKED: "bookmarked",
  APPLIED: "applied",
  INTERVIEWING: "interviewing",
  OFFER: "offer",
  REJECTED: "rejected",
  ARCHIVED: "archived",
} as const;

export const SOURCE_CODES = {
  MYCAREERSFUTURE: "mycareersfuture",
  MICHAEL_PAGE_SG: "michaelpage_sg",
} as const;

export const SALARY_PERIODS = {
  MONTHLY: "monthly",
  ANNUAL: "annual",
} as const;

export const MONTHS_PER_YEAR = 12;
export const IMPLAUSIBLE_MONTHLY_SALARY = 100000;
export const MINOR_UNITS_PER_MAJOR_UNIT = 100;
export const PERCENT_MAX = 100;

export const MIN_STACK_MATCH_SCORE = 1;

export const REJECTION_REASONS = {
  ENTRY_LEVEL: "entry_level",
  ON_SITE_ONLY: "on_site_only",
  CONTRACT_OR_TEMPORARY: "contract_or_temporary",
  NO_STACK_MATCH: "no_stack_match",
  NOT_TARGET_ROLE: "not_target_role",
} as const;

// Only these roles are kept: fullstack, frontend, web developer, React Native, AI engineer/developer (matched on the job title).
export const TARGET_ROLE_PATTERN = /\b(full[\s-]?stack|front[\s-]?end|web\s+(developer|engineer|application|app)|website\s+developer|react[\s-]?native|ai\b[^,()]{0,30}\b(engineer|developer))\b/i;
export const ENTRY_TITLE_PATTERN = /\b(junior|intern|internship|trainee|graduate)\b/i;
export const SENIOR_TITLE_PATTERN = /\b(senior|sr\.?)\b/i;
export const LEAD_TITLE_PATTERN = /\b(lead|principal|staff|head)\b/i;
export const CONTRACT_EMPLOYMENT_PATTERN = /contract|temporary|intern|attachment/i;

export const ON_SITE_ONLY_PATTERN = /\b(on-?site only|fully on-?site|100% on-?site)\b/i;
export const HYBRID_PATTERN = /\bhybrid\b/i;
export const FLEXIBLE_PATTERN = /\b(remote|work from home|flexible (hours|work))\b/i;

export const DEFAULT_SENIORITY = SENIORITIES.MID;

export const STACK_KEYWORDS = [
  { tag: "Next.js", pattern: /\bnext\.?js\b/i },
  { tag: "Angular", pattern: /\bangular(js)?\b/i },
  { tag: "TypeScript", pattern: /\btypescript\b/i },
  { tag: "Node.js", pattern: /\bnode\.?js\b/i },
  { tag: "NestJS", pattern: /\bnest\.?js\b/i },
  { tag: ".NET", pattern: /(^|[^\w])\.net\b|\bdotnet\b/i },
  { tag: "PHP", pattern: /\bphp\b/i },
  { tag: "WordPress", pattern: /\bwordpress\b/i },
  { tag: "PostgreSQL", pattern: /\bpostgres(ql)?\b/i },
  { tag: "MongoDB", pattern: /\bmongo(db)?\b/i },
  { tag: "AI", pattern: /\bAI\b|artificial intelligence|\bLLM\b/ },
  { tag: "RAG", pattern: /\bRAG\b|retrieval[- ]augmented/i },
] as const;

export const TRACKING_QUERY_PARAMS_PATTERN = /^(utm_.*|gclid|fbclid|ref|src|trk|trackingid)$/i;

export const HTTP_STATUS = {
  OK: 200,
  UNAUTHORIZED: 401,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const BEARER_PREFIX = "Bearer ";
export const CRON_SECRET_ENV_NAME = "CRON_SECRET";

export const MCF_API_URL = "https://api.mycareersfuture.gov.sg/v2/jobs";
export const MCF_SEARCH_KEYWORDS = [
  "next.js",
  "angular",
  "typescript",
  "node.js",
  "nestjs",
  ".net",
  "php",
  "wordpress",
  "postgresql",
  "mongodb",
  "rag",
  "ai integration",
] as const;
export const MCF_PAGE_SIZE = 100;
export const MCF_MAX_PAGES_PER_KEYWORD = 5;
export const MCF_REQUEST_DELAY_MS = 500;
export const MCF_REQUEST_TIMEOUT_MS = 20000;
export const MCF_SALARY_TYPE_PERIODS = {
  Monthly: SALARY_PERIODS.MONTHLY,
  Annual: SALARY_PERIODS.ANNUAL,
} as const;
export const MCF_POSITION_LEVEL_SENIORITIES = {
  "Fresh/entry level": SENIORITIES.ENTRY,
  "Non-executive": SENIORITIES.ENTRY,
  "Junior Executive": SENIORITIES.ENTRY,
  Executive: SENIORITIES.MID,
  "Senior Executive": SENIORITIES.SENIOR,
  Professional: SENIORITIES.SENIOR,
  Manager: SENIORITIES.LEAD,
  "Middle Management": SENIORITIES.LEAD,
  "Senior Management": SENIORITIES.LEAD,
} as const;

export interface TaxBand {
  upTo: number | null;
  rate: number;
}

export const TAX_YEAR_NOTES = {
  [COUNTRY_CODES.SINGAPORE]: "IRAS resident rates, YA 2024 onwards (applies to YA 2026)",
  [COUNTRY_CODES.NEW_ZEALAND]: "IRD bands in force from 1 Apr 2025 (2026-27 bands not yet confirmed) + ACC earners' levy 2026-27",
  [COUNTRY_CODES.MALAYSIA]: "LHDN resident rates, YA 2023-2025 (YA 2026 bands assumed unchanged)",
} as const;

export const SG_TAX_BANDS: TaxBand[] = [
  { upTo: 20000, rate: 0 },
  { upTo: 30000, rate: 0.02 },
  { upTo: 40000, rate: 0.035 },
  { upTo: 80000, rate: 0.07 },
  { upTo: 120000, rate: 0.115 },
  { upTo: 160000, rate: 0.15 },
  { upTo: 200000, rate: 0.18 },
  { upTo: 240000, rate: 0.19 },
  { upTo: 280000, rate: 0.195 },
  { upTo: 320000, rate: 0.2 },
  { upTo: 500000, rate: 0.22 },
  { upTo: 1000000, rate: 0.23 },
  { upTo: null, rate: 0.24 },
];

export const NZ_TAX_BANDS: TaxBand[] = [
  { upTo: 15600, rate: 0.105 },
  { upTo: 53500, rate: 0.175 },
  { upTo: 78100, rate: 0.3 },
  { upTo: 180000, rate: 0.33 },
  { upTo: null, rate: 0.39 },
];
export const NZ_ACC_LEVY_RATE = 0.0175;
export const NZ_ACC_MAX_LIABLE_EARNINGS = 156641;

export const MY_TAX_BANDS: TaxBand[] = [
  { upTo: 5000, rate: 0 },
  { upTo: 20000, rate: 0.01 },
  { upTo: 35000, rate: 0.03 },
  { upTo: 50000, rate: 0.06 },
  { upTo: 70000, rate: 0.11 },
  { upTo: 100000, rate: 0.19 },
  { upTo: 400000, rate: 0.25 },
  { upTo: 600000, rate: 0.26 },
  { upTo: 2000000, rate: 0.28 },
  { upTo: null, rate: 0.3 },
];
export const MY_PERSONAL_RELIEF = 9000;
export const MY_REBATE_AMOUNT = 400;
export const MY_REBATE_MAX_CHARGEABLE_INCOME = 35000;

export const FX_API_URL = "https://open.er-api.com/v6/latest/USD";
export const FX_BASE_CURRENCY = "USD";
export const IDR_CURRENCY_CODE = "IDR";
export const FX_TARGET_CURRENCIES = ["SGD", "MYR", "NZD", "USD"] as const;
export const FX_RATE_MICRO_FACTOR = 1_000_000;
export const FX_REQUEST_TIMEOUT_MS = 15000;

export const PRIORITY_WEIGHTS = {
  SAVINGS: 40,
  STACK: 25,
  COUNTRY: 15,
  WORK_MODE: 10,
  EMPLOYER: 10,
} as const;
export const SAVINGS_TARGET_IDR = 30_000_000;
export const COUNTRY_PRIORITY_SCORES: Record<string, number> = {
  [COUNTRY_CODES.SINGAPORE]: 100,
  [COUNTRY_CODES.MALAYSIA]: 70,
  [COUNTRY_CODES.NEW_ZEALAND]: 40,
};
export const WORK_MODE_PRIORITY_SCORES: Record<string, number> = {
  [WORK_MODES.FULL_TIME]: 100,
  [WORK_MODES.HYBRID]: 70,
  [WORK_MODES.FLEXIBLE]: 40,
  [WORK_MODES.ON_SITE]: 0,
};

export const BROWSER_PATH_ENV_NAME = "CHROME_EXECUTABLE_PATH";
export const DEFAULT_BROWSER_PATHS: Record<string, string> = {
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  linux: "/usr/bin/chromium",
};
export const BROWSER_NAVIGATION_TIMEOUT_MS = 45000;
export const BROWSER_READY_TIMEOUT_MS = 20000;
export const BROWSER_PAGE_DELAY_MS = 2000;
export const BOT_CHALLENGE_TITLE_PATTERN = /just a moment|access to this page has been denied|verify you are (a )?human|attention required/i;
export const HTTP_STATUS_FORBIDDEN = 403;
export const HTTP_STATUS_TOO_MANY_REQUESTS = 429;

export const MICHAEL_PAGE_SG_LIST_URL = "https://www.michaelpage.com.sg/jobs/technology";
export const MICHAEL_PAGE_BASE_URL = "https://www.michaelpage.com.sg";
export const MICHAEL_PAGE_MAX_PAGES = 8;
export const MICHAEL_PAGE_CLIENT_COMPANY = "Michael Page (client undisclosed)";

export const MAX_COMPARE_JOBS = 4;
export const TRACKED_JOB_STATUSES = [
  JOB_STATUSES.BOOKMARKED,
  JOB_STATUSES.APPLIED,
  JOB_STATUSES.INTERVIEWING,
  JOB_STATUSES.OFFER,
] as const;
export const HIDDEN_JOB_STATUSES = [JOB_STATUSES.REJECTED, JOB_STATUSES.ARCHIVED] as const;
export const SORT_KEYS = {
  PRIORITY: "priority",
  SAVINGS: "savings",
  STACK: "stack",
  NEWEST: "newest",
} as const;
export const DEFAULT_SORT_KEY = SORT_KEYS.PRIORITY;
export const RECENT_SCRAPE_RUNS_LIMIT = 24;
export const HISTORY_DAYS_LIMIT = 30;
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const SEARCH_MAX_LENGTH = 100;

export const LIST_PAGE_SIZE = 50;
export const FIRST_PAGE = 1;

export const DOCUMENT_KINDS = {
  CV: "cv",
  COVER_LETTER: "cover_letter",
} as const;
export const REFERENCE_CV_PATH = "data/reference-cv.md";
export const CV_PRESENT_LABEL = "Present";
export const CV_PRESENT_PATTERN = /current|present|now/i;
export const CV_MAX_PAGES = 2;
export const CV_ALLOWED_HEADINGS = ["Summary", "Work Experience", "Education", "Skills", "Certifications"] as const;
export const CV_MONTH_ABBREVIATIONS: Record<string, string> = {
  january: "Jan", february: "Feb", march: "Mar", april: "Apr", may: "May", june: "Jun",
  july: "Jul", august: "Aug", september: "Sep", october: "Oct", november: "Nov", december: "Dec",
};
export const CV_COMPACTION_LEVELS = [
  { maxRoles: 20, maxBulletsPerRole: 99, includeSummaryParagraphs: 2 },
  { maxRoles: 20, maxBulletsPerRole: 6, includeSummaryParagraphs: 2 },
  { maxRoles: 6, maxBulletsPerRole: 4, includeSummaryParagraphs: 1 },
  { maxRoles: 5, maxBulletsPerRole: 3, includeSummaryParagraphs: 1 },
  { maxRoles: 4, maxBulletsPerRole: 3, includeSummaryParagraphs: 1 },
] as const;
export const CV_MAX_SKILLS = 30;
export const COVER_LETTER_MAX_SKILLS = 5;
export const UNDISCLOSED_COMPANY_PATTERN = /undisclosed/i;
export const WORK_AUTHORIZATION_MAX_LENGTH = 300;

export const APPLY_STATES = {
  NEEDS_DOCUMENTS: "needs_documents",
  READY: "ready",
  APPLIED: "applied",
  SKIPPED: "skipped",
} as const;
export const APPLY_FILL_PROFILE_SOURCES = [SOURCE_CODES.MICHAEL_PAGE_SG] as const;
export const APPLY_LINK_PATTERN = /^\s*apply( now| for this job)?\s*$/i;
export const APPLY_PAGE_SETTLE_MS = 2500;
export const APPLY_TEMP_DIR_PREFIX = "radar-apply-";
export const APPLY_ACTION_TIMEOUT_MS = 5000;
export const APPLY_TEMP_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const EMAIL_CATEGORIES = {
  INTERVIEW: "interview",
  ASSESSMENT: "assessment",
  OFFER: "offer",
  REJECTION: "rejection",
  RECEIVED: "application_received",
  OTHER: "other",
} as const;
// Order matters: the first matching rule wins (a rejection often mentions "interview").
export const EMAIL_CATEGORY_RULES: { category: string; pattern: RegExp }[] = [
  { category: EMAIL_CATEGORIES.REJECTION, pattern: /unfortunately|regret to inform|not (been )?successful|not moving forward|will not be (moving|proceeding)|other candidates|decided not to/i },
  { category: EMAIL_CATEGORIES.OFFER, pattern: /offer letter|pleased to offer|job offer|offer of employment|we would like to offer/i },
  { category: EMAIL_CATEGORIES.INTERVIEW, pattern: /interview|schedule a call|invite you to (a )?(call|meet|chat)|meet with (our|the) team/i },
  { category: EMAIL_CATEGORIES.ASSESSMENT, pattern: /assessment|coding (test|challenge)|take-?home|technical test|hackerrank|codility|codesignal/i },
  { category: EMAIL_CATEGORIES.RECEIVED, pattern: /thank you for applying|application (has been )?received|received your application|we have received your/i },
];
export const EMAIL_SUGGESTED_STATUS: Record<string, string | null> = {
  [EMAIL_CATEGORIES.INTERVIEW]: JOB_STATUSES.INTERVIEWING,
  [EMAIL_CATEGORIES.ASSESSMENT]: JOB_STATUSES.INTERVIEWING,
  [EMAIL_CATEGORIES.OFFER]: JOB_STATUSES.OFFER,
  [EMAIL_CATEGORIES.REJECTION]: JOB_STATUSES.REJECTED,
  [EMAIL_CATEGORIES.RECEIVED]: null,
  [EMAIL_CATEGORIES.OTHER]: null,
};
export const EMAIL_MATCH_WEIGHTS = { DOMAIN: 5, UNDISCLOSED_DOMAIN: 2, COMPANY_IN_TEXT: 4, TITLE: 3, REFERENCE: 6 } as const;
export const EMAIL_MATCH_MIN_SCORE = 5;
export const EMAIL_TITLE_MATCH_RATIO = 0.6;
export const EMAIL_MIN_TOKEN_LENGTH = 3;
export const EMAIL_MIN_REFERENCE_LENGTH = 6;
export const COMPANY_STOP_WORDS = ["pte", "ltd", "limited", "private", "sdn", "bhd", "inc", "llc", "co", "the", "and", "group", "singapore", "malaysia", "holdings", "international", "technologies", "technology", "solutions", "services"] as const;
export const FREE_MAIL_DOMAINS = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "proton.me", "protonmail.com"] as const;
export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const GMAIL_API_URL = "https://gmail.googleapis.com/gmail/v1/users/me";
export const GMAIL_QUERY = 'newer_than:30d -category:promotions -category:social (application OR interview OR assessment OR offer OR unfortunately OR regret OR "thank you for applying" OR "your application")';
export const GMAIL_MAX_MESSAGES = 100;
export const GMAIL_REQUEST_TIMEOUT_MS = 20000;
export const GOOGLE_CLIENT_ID_ENV_NAME = "GOOGLE_CLIENT_ID";
export const GOOGLE_CLIENT_SECRET_ENV_NAME = "GOOGLE_CLIENT_SECRET";
export const GOOGLE_REDIRECT_URI_ENV_NAME = "GOOGLE_REDIRECT_URI";
export const GOOGLE_DEFAULT_REDIRECT_URI = "http://127.0.0.1:3000/api/auth/google/callback";
export const GOOGLE_STATE_COOKIE = "google_oauth_state";
export const GOOGLE_VERIFIER_COOKIE = "google_oauth_verifier";
export const GOOGLE_COOKIE_MAX_AGE_SECONDS = 600;
export const HTTP_STATUS_SERVICE_UNAVAILABLE = 503;
export const EMAIL_PANEL_RECENT_LIMIT = 10;
