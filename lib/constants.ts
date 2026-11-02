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
} as const;

export const SALARY_PERIODS = {
  MONTHLY: "monthly",
  ANNUAL: "annual",
} as const;

export const MONTHS_PER_YEAR = 12;
export const MINOR_UNITS_PER_MAJOR_UNIT = 100;
export const PERCENT_MAX = 100;

export const MIN_STACK_MATCH_SCORE = 1;

export const REJECTION_REASONS = {
  ENTRY_LEVEL: "entry_level",
  ON_SITE_ONLY: "on_site_only",
  CONTRACT_OR_TEMPORARY: "contract_or_temporary",
  NO_STACK_MATCH: "no_stack_match",
} as const;

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
