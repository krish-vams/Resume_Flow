import { formatJobStatus, type JobStatus } from "@/lib/jobs";

export type GmailStatus = {
  connected: boolean;
  gmailEmail?: string | null;
  connectedAt?: string | null;
  lastScanAt?: string | null;
};

export type EmailDetectionRecord = {
  id: string;
  jobEmailId: string;
  detectionType: string;
  suggestedStatus?: JobStatus | null;
  confidence: number;
  reason?: string | null;
  decisionStatus: string;
  confirmedAt?: string | null;
  ignoredAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JobEmailRecord = {
  id: string;
  userId: string;
  jobId?: string | null;
  gmailMessageId: string;
  gmailThreadId?: string | null;
  fromEmail?: string | null;
  subject: string;
  snippet?: string | null;
  receivedAt?: string | null;
  detectionType: string;
  suggestedStatus?: JobStatus | null;
  confidence: number;
  reason?: string | null;
  decisionStatus: string;
  job?: {
    id: string;
    companyName: string;
    jobTitle: string;
    status: JobStatus;
  } | null;
  detections: EmailDetectionRecord[];
  createdAt: string;
  updatedAt: string;
};

export function formatDetectionType(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

export function formatSuggestedStatus(status: JobStatus | null | undefined) {
  return status ? formatJobStatus(status) : "Store only";
}
