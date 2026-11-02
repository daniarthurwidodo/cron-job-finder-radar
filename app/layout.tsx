import type { Metadata } from "next";
import Link from "next/link";
import { DASHBOARD_PATH } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: "Expat Job Radar",
  description: "Daily expat tech jobs with net savings in IDR",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col md:flex-row">
        <aside className="border-b border-slate-300 dark:border-slate-700 md:w-56 md:shrink-0 md:border-b-0 md:border-r">
          <nav aria-label="Main" className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 md:sticky md:top-0 md:flex-col md:items-stretch md:gap-3 md:py-6">
            <Link href={DASHBOARD_PATH} className="font-semibold">
              Expat Job Radar
            </Link>
            <Link href={DASHBOARD_PATH} className="text-sm hover:underline">
              Dashboard
            </Link>
            <Link href="/apply" className="text-sm hover:underline">
              Apply queue
            </Link>
            <Link href="/settings" className="text-sm hover:underline">
              Settings
            </Link>
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
