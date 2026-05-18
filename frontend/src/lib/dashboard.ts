import type { JobStatus } from "@/lib/jobs";

export type DashboardMetrics = {
  totalJobsSaved: number;
  totalResumesGenerated: number;
  applicationsSubmitted: number;
  interviewsScheduled: number;
  assessments: number;
  rejections: number;
  offers: number;
  ghostedApplications: number;
  averageMatchScore: number;
  responseRate: number;
  interviewRate: number;
  followUpsDue: number;
};

export type StatusDistributionPoint = {
  status: JobStatus;
  count: number;
};

export type DailyApplicationsPoint = {
  date: string;
  applications: number;
};

export type DashboardNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  dueAt?: string | null;
  application?: {
    id: string;
    job: {
      id: string;
      companyName: string;
      jobTitle: string;
    };
  } | null;
};

export type DashboardSummary = {
  metrics: DashboardMetrics;
  charts: {
    statusDistribution: StatusDistributionPoint[];
    dailyApplications: DailyApplicationsPoint[];
  };
  upcomingNotifications: DashboardNotification[];
};

export function formatMetricValue(value: number, suffix = "") {
  return `${value.toLocaleString()}${suffix}`;
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}
