import Link from "next/link";
import { EmailItem } from "@/app/_components/EmailItem";
import { getServices } from "@/lib/container";

export function EmailPanel() {
  const { email } = getServices();
  const status = email.getConnectionStatus();
  const { pending, recent } = email.getPanelData();
  return (
    <section className="rounded border border-slate-300 p-4 dark:border-slate-700">
      <h2 className="mb-2 text-lg font-semibold">Email updates</h2>
      {!status.isConfigured || !status.accountEmail ? (
        <p className="text-sm">
          Email check is off. Set it up in <Link href="/settings" className="underline">Settings</Link>.
        </p>
      ) : (
        <>
          <p className="mb-2 text-sm">
            {status.accountEmail}
            {status.lastRun
              ? ` - last sync ${status.lastRun.startedAt.replace("T", " ").slice(0, 16)} UTC, ${status.lastRun.matchedCount} new matched`
              : " - no sync yet"}
            {status.lastRun?.errorMessage ? ` - ERROR: ${status.lastRun.errorMessage}` : ""}
          </p>
          <p className="mb-1 text-sm font-medium">Status suggestions waiting for you: {pending.length}</p>
          <ul className="flex flex-col gap-2">
            {(pending.length > 0 ? pending : recent).map((item) => (
              <EmailItem key={item.id} email={item} showJob />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
