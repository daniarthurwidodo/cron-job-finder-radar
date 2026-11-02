"use client";

import { useActionState } from "react";
import { runScrapeNow, type ScrapeNowState } from "@/app/actions";
import { SOURCE_LABELS } from "@/lib/dashboard/format";

const INITIAL_STATE: ScrapeNowState = {};

export function ScrapeNowForm({ sourceCodes }: { sourceCodes: string[] }) {
  const [state, formAction, isPending] = useActionState(runScrapeNow, INITIAL_STATE);
  return (
    <form action={formAction} className="mb-3 flex flex-col gap-2">
      <fieldset className="flex flex-wrap gap-x-4 gap-y-1">
        <legend className="mb-1 text-xs text-slate-500">Boards to scrape</legend>
        {sourceCodes.map((sourceCode) => (
          <label key={sourceCode} className="flex items-center gap-1 text-sm">
            <input type="checkbox" name="sources" value={sourceCode} defaultChecked />
            {SOURCE_LABELS[sourceCode]}
          </label>
        ))}
      </fieldset>
      <button type="submit" disabled={isPending} className="w-fit rounded bg-slate-800 px-3 py-1 text-sm text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900">
        {isPending ? "Scraping (may take a few minutes)..." : "Run daily scrape now"}
      </button>
      {state.message && <p className="text-sm text-green-700">{state.message}</p>}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
