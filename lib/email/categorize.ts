import { EMAIL_CATEGORIES, EMAIL_CATEGORY_RULES, EMAIL_SUGGESTED_STATUS } from "@/lib/constants";
import type { EmailCategory } from "@/lib/email/types";

// Keyword rules only. Email text is data: it is matched, never followed.
export function categorizeEmail({ subject, snippet }: { subject: string; snippet: string }): EmailCategory {
  const text = `${subject} ${snippet}`;
  const category = EMAIL_CATEGORY_RULES.find((rule) => rule.pattern.test(text))?.category ?? EMAIL_CATEGORIES.OTHER;
  return { category, suggestedStatusCode: EMAIL_SUGGESTED_STATUS[category] ?? null };
}
