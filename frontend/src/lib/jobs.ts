export const jobStatusOptions = [
  { value: "SAVED", label: "Saved" },
  { value: "RESUME_NEEDED", label: "Resume Needed" },
  { value: "RESUME_GENERATED", label: "Resume Generated" },
  { value: "APPLIED", label: "Applied" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "REJECTED", label: "Rejected" },
  { value: "OFFER", label: "Offer" },
  { value: "GHOSTED", label: "Ghosted" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

export type JobStatus = (typeof jobStatusOptions)[number]["value"];

export type JobRecord = {
  id: string;
  companyName: string;
  jobTitle: string;
  location?: string | null;
  jobUrl?: string | null;
  jobType?: string | null;
  jobDescription: string;
  seniorityLevel?: string | null;
  requiredSkillsJson?: unknown;
  preferredSkillsJson?: unknown;
  eligibilityFlagsJson?: unknown;
  recommendedFocusTemplateId?: string | null;
  recommendedFocusTemplate?: {
    id: string;
    name: string;
    focusType: string;
  } | null;
  status: JobStatus;
  notes?: string | null;
  _count: {
    resumeVersions: number;
    applications: number;
  };
  createdAt: string;
  updatedAt: string;
};

export function formatJobStatus(status: string) {
  return jobStatusOptions.find((option) => option.value === status)?.label ?? status;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
