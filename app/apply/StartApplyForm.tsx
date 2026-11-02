"use client";

import { useActionState } from "react";
import { startApply, type StartApplyState } from "@/app/actions";

const INITIAL_STATE: StartApplyState = {};

export function StartApplyForm({ jobId }: { jobId: number }) {
  const [state, formAction, isPending] = useActionState(startApply, INITIAL_STATE);
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="jobId" value={jobId} />
      <button type="submit" disabled={isPending} className="w-fit rounded bg-slate-800 px-3 py-1 text-xs text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900">
        {isPending ? "Opening..." : "Start apply"}
      </button>
      {state.error && <p className="max-w-xs text-xs text-red-600">{state.error}</p>}
      {state.report && (
        <div className="max-w-xs text-xs text-slate-600 dark:text-slate-300">
          <p>Window opened. Filled: {state.report.filled.length > 0 ? state.report.filled.join(", ") : "nothing"}. CV uploaded: {state.report.uploadedCv ? "yes" : "no"}.</p>
          {state.report.notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      )}
    </form>
  );
}
