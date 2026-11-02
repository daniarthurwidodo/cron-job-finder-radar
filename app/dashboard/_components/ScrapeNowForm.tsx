"use client";

import { useActionState } from "react";
import { runScrapeNow, type ScrapeNowState } from "@/app/actions";

const INITIAL_STATE: ScrapeNowState = {};

export function ScrapeNowForm() {
  const [state, formAction, isPending] = useActionState(runScrapeNow, INITIAL_STATE);
  return (
    <form action={formAction} className="mb-3 flex flex-wrap items-center gap-3">
      <button type="submit" disabled={isPending} className="rounded bg-slate-800 px-3 py-1 text-sm text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900">
        {isPending ? "Scraping (may take a few minutes)..." : "Run daily scrape now"}
      </button>
      {state.message && <p className="text-sm text-green-700">{state.message}</p>}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
