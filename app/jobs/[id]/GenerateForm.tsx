"use client";

import { useActionState } from "react";
import { generateDocuments, type GenerateState } from "@/app/actions";

const INITIAL_STATE: GenerateState = {};

export function GenerateForm({ jobId, hasDocuments }: { jobId: number; hasDocuments: boolean }) {
  const [state, formAction, isPending] = useActionState(generateDocuments, INITIAL_STATE);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="jobId" value={jobId} />
      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded bg-slate-800 px-3 py-1 text-sm text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
      >
        {isPending ? "Generating..." : hasDocuments ? "Regenerate CV and letter" : "Generate CV and letter"}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
