import { michaelPageScraper } from "@/lib/scrapers/michaelpage";

async function main(): Promise<void> {
  const jobs = await michaelPageScraper.fetchJobs();
  const withSalary = jobs.filter((job) => job.salaryMin !== null).length;
  const sample = jobs.slice(0, 2).map((j) => ({ t: j.title, u: j.sourceUrl, s: [j.salaryMin, j.salaryMax, j.salaryPeriod], d: j.descriptionHtml.slice(0, 120) }));
  process.stdout.write(JSON.stringify({ count: jobs.length, withSalary, sample }, null, 1) + "\n");
}

main();
