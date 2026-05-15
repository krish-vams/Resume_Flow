export type CandidateProfileSummary = {
  id: string;
  fullName: string;
  email: string;
  defaultResumeName?: string | null;
};

export type ResumeValidationCheck = {
  name: string;
  status: "passed" | "warning" | "failed";
  details: string;
};

export type ResumeValidationRecord = {
  id: string;
  resumeVersionId: string;
  summaryWordCount?: number | null;
  accentureBulletCount?: number | null;
  dreamsBulletCount?: number | null;
  capitalBulletCount?: number | null;
  invalidBulletsJson?: unknown;
  missingRequiredSkillsJson?: unknown;
  missingPreferredSkillsJson?: unknown;
  languageRuleViolationsJson?: unknown;
  aiToolViolationsJson?: unknown;
  boldMarkerViolationsJson?: unknown;
  checksJson?: ResumeValidationCheck[] | null;
  overallScore?: number | null;
  overallStatus: "NOT_RUN" | "PASSED" | "WARNING" | "FAILED";
  createdAt: string;
};

export type ResumeJobSummary = {
  id: string;
  companyName: string;
  jobTitle: string;
  jobDescription?: string | null;
  status?: string | null;
  jobUrl?: string | null;
  location?: string | null;
};

export type ResumeVersionRecord = {
  id: string;
  userId: string;
  jobId: string;
  candidateProfileId?: string | null;
  promptTemplateId?: string | null;
  focusTemplateId?: string | null;
  resumeName: string;
  rawResumeText?: string | null;
  rawResumeFileUrl?: string | null;
  formattedDocxUrl?: string | null;
  formattedPdfUrl?: string | null;
  version: number;
  matchScore?: number | null;
  validationStatus: string;
  status: string;
  job: ResumeJobSummary;
  candidateProfile?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  promptTemplate?: {
    id: string;
    name: string;
    description?: string | null;
    promptText?: string | null;
    targetRole?: string | null;
    version: number;
  } | null;
  focusTemplate?: {
    id: string;
    name: string;
    focusType: string;
    description?: string | null;
    primaryLanguage?: string | null;
  } | null;
  validation?: ResumeValidationRecord | null;
  createdAt: string;
  updatedAt: string;
};

export function formatResumeStatus(status: string) {
  return status
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

export function formatValidationStatus(status: string) {
  return formatResumeStatus(status);
}

export function downloadResumeFile(resume: ResumeVersionRecord, kind: "raw" | "formatted") {
  return {
    path: `/api/resumes/${resume.id}/download-${kind}`,
    fileName: `${resume.resumeName.replace(/[^a-zA-Z0-9._-]/g, "-")}${kind === "formatted" ? "-formatted" : ""}-v${resume.version}.docx`,
  };
}
