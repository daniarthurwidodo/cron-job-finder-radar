import { PERCENT_MAX, STACK_KEYWORDS } from "@/lib/constants";
import type { StackMatch } from "@/lib/types";

export function matchStack(text: string): StackMatch {
  const tags = STACK_KEYWORDS.filter((keyword) => keyword.pattern.test(text)).map((keyword) => keyword.tag);
  const score = Math.round((tags.length * PERCENT_MAX) / STACK_KEYWORDS.length);
  return { score, tags };
}
