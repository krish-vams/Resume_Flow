export const applicationStatusOptions = [
  { value: "SAVED", label: "Saved" },
  { value: "RESUME_GENERATED", label: "Resume Generated" },
  { value: "APPLIED", label: "Applied" },
  { value: "RECRUITER_REACHED_OUT", label: "Recruiter Reached Out" },
  { value: "INTERVIEW", label: "Interview Scheduled" },
  { value: "ASSESSMENT", label: "Assessment" },
  { value: "REJECTED", label: "Rejected" },
  { value: "OFFER", label: "Offer" },
  { value: "GHOSTED", label: "Ghosted" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

export type ApplicationStatus = (typeof applicationStatusOptions)[number]["value"];

export type ApplicationRecord = {
  id: string;
  userId: string;
  jobId: string;
  resumeVersionId?: string | null;
  status: ApplicationStatus;
  appliedDate?: string | null;
  followUpDate?: string | null;
  recruiterName?: string | null;
  recruiterEmail?: string | null;
  interviewDate?: string | null;
  assessmentDueDate?: string | null;
  notes?: string | null;
  job: {
    id: string;
    companyName: string;
    jobTitle: string;
    jobUrl?: string | null;
    status: string;
  };
  resumeVersion?: {
    id: string;
    resumeName: string;
    version: number;
    formattedDocxUrl?: string | null;
    validationStatus: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export function formatApplicationStatus(status: string) {
  return applicationStatusOptions.find((option) => option.value === status)?.label ?? status;
}

export function dateInputValue(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}
