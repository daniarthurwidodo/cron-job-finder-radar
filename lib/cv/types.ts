export interface CvRole {
  company: string;
  title: string;
  dates: string;
  startYear: number;
  technologies: string[];
  bullets: string[];
}

export interface CvEducation {
  institution: string;
  period: string;
  detail: string;
}

export interface ReferenceCv {
  name: string;
  headline: string;
  phone: string;
  email: string;
  location: string;
  linkedIn: string;
  summaryParagraphs: string[];
  roles: CvRole[];
  education: CvEducation[];
  skills: string[];
  certifications: string[];
}

export interface JobContext {
  title: string;
  companyName: string;
  countryCode: string;
  text: string;
  techTags: string[];
}

export interface TailoredCv {
  name: string;
  headline: string;
  contactLine: string;
  workAuthorization: string;
  summaryParagraphs: string[];
  roles: CvRole[];
  education: CvEducation[];
  skills: string[];
  certifications: string[];
}
