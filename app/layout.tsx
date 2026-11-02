import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Expat Job Radar",
  description: "Daily expat tech jobs with net savings in IDR",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-slate-300 dark:border-slate-700">
          <nav className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
            <Link href="/" className="font-semibold">
              Expat Job Radar
            </Link>
            <Link href="/" className="text-sm hover:underline">
              Dashboard
            </Link>
            <Link href="/settings" className="text-sm hover:underline">
              Settings
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
