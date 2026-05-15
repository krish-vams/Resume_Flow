export type CandidateProfileSummary = {
  id: string;
  fullName: string;
  email: string;
  defaultResumeName?: string | null;
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
  job: {
    id: string;
    companyName: string;
    jobTitle: string;
  };
  candidateProfile?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  promptTemplate?: {
    id: string;
    name: string;
    version: number;
  } | null;
  focusTemplate?: {
    id: string;
    name: string;
    focusType: string;
  } | null;
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
