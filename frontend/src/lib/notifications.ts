import type { ApplicationStatus } from "@/lib/applications";

export type NotificationRecord = {
  id: string;
  userId: string;
  applicationId?: string | null;
  title: string;
  message: string;
  type: string;
  read: boolean;
  dueAt?: string | null;
  application?: {
    id: string;
    status: ApplicationStatus;
    job: {
      id: string;
      companyName: string;
      jobTitle: string;
    };
  } | null;
  createdAt: string;
  updatedAt: string;
};

export function formatNotificationType(type: string) {
  return type
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}
