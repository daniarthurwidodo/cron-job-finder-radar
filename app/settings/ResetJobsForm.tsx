"use client";

import { useActionState, useState } from "react";
import { resetJobData, type ResetJobsState } from "@/app/actions";
import { RESET_CONFIRMATION_WORD } from "@/lib/constants";

const INITIAL_STATE: ResetJobsState = {};

export function ResetJobsForm() {
  const [state, formAction, isPending] = useActionState(resetJobData, INITIAL_STATE);
  const [confirmation, setConfirmation] = useState("");
  const isConfirmed = confirmation.trim() === RESET_CONFIRMATION_WORD;
  return (
    <form action={formAction} className="flex flex-col gap-2 rounded border border-red-300 p-3 dark:border-red-800">
      <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">Danger zone - reset job data</h2>
      <p className="text-sm">
        Permanently deletes every job and its history: statuses, apply queue, generated CVs and letters, matched emails and scrape runs. Cost-of-living
        values, work authorization lines, exchange rates and the Google connection are kept. This cannot be undone.
      </p>
      <label className="flex flex-wrap items-center gap-2 text-sm">
        Type {RESET_CONFIRMATION_WORD} to confirm
        <input
          name="confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          className="w-32 rounded border border-slate-300 bg-transparent px-2 py-1 dark:border-slate-600"
        />
      </label>
      <button type="submit" disabled={!isConfirmed || isPending} className="w-fit rounded bg-red-700 px-3 py-1 text-sm text-white disabled:opacity-40">
        {isPending ? "Deleting..." : "Delete all job data"}
      </button>
      {state.message && <p className="text-sm text-green-700">{state.message}</p>}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
