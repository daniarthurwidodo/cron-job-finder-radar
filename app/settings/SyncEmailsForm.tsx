"use client";

import { useActionState } from "react";
import { syncEmailsNow, type SyncEmailsState } from "@/app/actions";

const INITIAL_STATE: SyncEmailsState = {};

export function SyncEmailsForm() {
  const [state, formAction, isPending] = useActionState(syncEmailsNow, INITIAL_STATE);
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <button type="submit" disabled={isPending} className="w-fit rounded bg-slate-800 px-3 py-1 text-sm text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900">
        {isPending ? "Syncing..." : "Sync emails now"}
      </button>
      {state.message && <p className="text-sm text-green-700">{state.message}</p>}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
