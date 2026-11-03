import type { SALARY_PERIODS } from "@/lib/constants";

export type SalaryPeriod = (typeof SALARY_PERIODS)[keyof typeof SALARY_PERIODS];

export interface RawJob {
  sourceCode: string;
  sourceJobId: string;
  sourceUrl: string;
  title: string;
  companyName: string;
  city: string;
  countryCode: string;
  currencyCode: string;
  descriptionHtml: string;
  postedAt: string | null;
  employmentTypes: string[];
  positionLevels: string[];
  flexibleWorkArrangements: string[];
  skills: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: SalaryPeriod | null;
}

export interface NormalizedJob {
  sourceCode: string;
  sourceJobId: string;
  sourceUrl: string;
  title: string;
  companyName: string;
  city: string;
  countryCode: string;
  currencyCode: string;
  description: string;
  postedAt: string | null;
  workModeCode: string;
  seniorityCode: string;
  isContractOrTemporary: boolean;
  hasVisaSponsorship: boolean;
  skills: string[];
  salaryMinMonthlyMinor: number | null;
  salaryMaxMonthlyMinor: number | null;
}

export interface StackMatch {
  score: number;
  tags: string[];
}

export interface ScoredJob extends NormalizedJob {
  stackMatch: StackMatch;
}

export interface Scraper {
  sourceCode: string;
  fetchJobs: () => Promise<RawJob[]>;
}
