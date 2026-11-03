"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SCRAPE_POLL_INTERVAL_MS } from "@/lib/constants";

// While a background scrape runs, re-render the server data on a timer so new run rows and counts appear.
export function ScrapeLiveRefresh({ isRunning }: { isRunning: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => router.refresh(), SCRAPE_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isRunning, router]);
  return null;
}
