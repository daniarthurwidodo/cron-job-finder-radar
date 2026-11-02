import {
  COMPANY_STOP_WORDS,
  EMAIL_MATCH_MIN_SCORE,
  EMAIL_MATCH_WEIGHTS,
  EMAIL_MIN_REFERENCE_LENGTH,
  EMAIL_MIN_TOKEN_LENGTH,
  EMAIL_TITLE_MATCH_RATIO,
  FREE_MAIL_DOMAINS,
  UNDISCLOSED_COMPANY_PATTERN,
} from "@/lib/constants";
import type { CandidateJob, EmailMatch, RawEmail } from "@/lib/email/types";
import { normalizeText } from "@/lib/services/dedup";

const ADDRESS_PATTERN = /<([^>]+)>/;
const UNDISCLOSED_NOISE = ["undisclosed", "client"];
const MIN_DOMAIN_TOKEN_LENGTH = 4;

function tokensOf(text: string): string[] {
  return normalizeText(text).split(" ").filter((token) => token.length >= EMAIL_MIN_TOKEN_LENGTH);
}

export function senderDomain(from: string): string {
  const address = ADDRESS_PATTERN.exec(from)?.[1] ?? from;
  return address.split("@")[1]?.trim().toLowerCase() ?? "";
}

function companyTokens(companyName: string): string[] {
  const stopWords: readonly string[] = [...COMPANY_STOP_WORDS, ...UNDISCLOSED_NOISE];
  return tokensOf(companyName).filter((token) => !stopWords.includes(token));
}

function hasDomainMatch({ domain, tokens }: { domain: string; tokens: string[] }): boolean {
  if (!domain || (FREE_MAIL_DOMAINS as readonly string[]).includes(domain)) return false;
  return tokens.some((token) => token.length >= MIN_DOMAIN_TOKEN_LENGTH && domain.includes(token));
}

function scoreCandidate({ email, candidate }: { email: RawEmail; candidate: CandidateJob }): EmailMatch {
  const text = ` ${normalizeText(`${email.subject} ${email.snippet}`)} `;
  const rawText = `${email.subject} ${email.snippet}`.toLowerCase();
  const tokens = companyTokens(candidate.companyName);
  const isUndisclosed = UNDISCLOSED_COMPANY_PATTERN.test(candidate.companyName);
  const reasons: string[] = [];
  let score = 0;
  if (hasDomainMatch({ domain: senderDomain(email.from), tokens })) {
    score += isUndisclosed ? EMAIL_MATCH_WEIGHTS.UNDISCLOSED_DOMAIN : EMAIL_MATCH_WEIGHTS.DOMAIN;
    reasons.push("sender domain");
  }
  if (!isUndisclosed && tokens.length > 0 && tokens.every((token) => text.includes(` ${token} `))) {
    score += EMAIL_MATCH_WEIGHTS.COMPANY_IN_TEXT;
    reasons.push("company name in text");
  }
  const titleTokens = tokensOf(candidate.title);
  const titleHits = titleTokens.filter((token) => text.includes(` ${token} `)).length;
  if (titleTokens.length > 0 && titleHits / titleTokens.length >= EMAIL_TITLE_MATCH_RATIO) {
    score += EMAIL_MATCH_WEIGHTS.TITLE;
    reasons.push("job title");
  }
  if (candidate.sourceJobIds.some((id) => id.length >= EMAIL_MIN_REFERENCE_LENGTH && rawText.includes(id.toLowerCase()))) {
    score += EMAIL_MATCH_WEIGHTS.REFERENCE;
    reasons.push("job reference");
  }
  return { jobId: candidate.id, score, reason: reasons.join(", ") };
}

// Returns the single best job, or null when nothing scores high enough or two jobs tie (never guess).
export function matchEmailToJob({ email, candidates }: { email: RawEmail; candidates: CandidateJob[] }): EmailMatch | null {
  const scored = candidates.map((candidate) => scoreCandidate({ email, candidate })).sort((left, right) => right.score - left.score);
  const [best, second] = scored;
  if (!best || best.score < EMAIL_MATCH_MIN_SCORE) return null;
  if (second && second.score === best.score) return null;
  return best;
}
