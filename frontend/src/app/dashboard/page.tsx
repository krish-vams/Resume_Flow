"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  formatMetricValue,
  formatShortDate,
  type DashboardSummary,
} from "@/lib/dashboard";
import { formatDate, formatJobStatus } from "@/lib/jobs";
import { formatNotificationType } from "@/lib/notifications";

type User = {
  id: string;
  name: string;
  email: string;
};

const navCards = [
  {
    title: "Jobs",
    href: "/jobs",
    body: "Save job descriptions, track status, and keep each generated resume connected to its source JD.",
  },
  {
    title: "Candidate Profile",
    href: "/settings/profile",
    body: "Store contact details, education, certifications, and the default resume output name.",
  },
  {
    title: "Prompt Library",
    href: "/prompts",
    body: "Save Gemini prompt templates, version edits, duplicate variants, and assemble final prompts.",
  },
  {
    title: "Focus Templates",
    href: "/focus-templates",
    body: "Manage stack-specific resume strategies for Java, .NET, Node.js, Go, AI, cloud, and full-stack roles.",
  },
  {
    title: "Resume Library",
    href: "/resumes",
    body: "Find generated resumes by company, role, focus type, validation status, and application status.",
  },
  {
    title: "Application Tracker",
    href: "/applications",
    body: "Track applied jobs, resumes used, recruiters, interviews, follow-ups, and outcomes.",
  },
  {
    title: "Reference Library",
    href: "/reference-library",
    body: "Upload Excel writing guides, parse reference rows, search examples, and use selected context in prompts.",
  },
  {
    title: "Gmail Job Emails",
    href: "/gmail",
    body: "Connect Gmail, scan job-related emails, and confirm recruiter, interview, assessment, or rejection updates.",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<{ user: User }>("/api/auth/me"),
      apiFetch<{ summary: DashboardSummary }>("/api/dashboard/summary"),
    ])
      .then(([userPayload, summaryPayload]) => {
        setUser(userPayload.user);
        setSummary(summaryPayload.summary);
      })
      .catch(() => router.push("/login"))
      .finally(() => setIsLoading(false));
  }, [router]);

  const metricCards = useMemo(() => {
    if (!summary) {
      return [];
    }

    const metrics = summary.metrics;

    return [
      { label: "Total Jobs Saved", value: formatMetricValue(metrics.totalJobsSaved) },
      { label: "Total Resumes Generated", value: formatMetricValue(metrics.totalResumesGenerated) },
      { label: "Applications Submitted", value: formatMetricValue(metrics.applicationsSubmitted) },
      { label: "Interviews Scheduled", value: formatMetricValue(metrics.interviewsScheduled) },
      { label: "Assessments", value: formatMetricValue(metrics.assessments) },
      { label: "Rejections", value: formatMetricValue(metrics.rejections) },
      { label: "Offers", value: formatMetricValue(metrics.offers) },
      { label: "Ghosted Applications", value: formatMetricValue(metrics.ghostedApplications) },
      { label: "Average Match Score", value: formatMetricValue(metrics.averageMatchScore, "%") },
      { label: "Response Rate", value: formatMetricValue(metrics.responseRate, "%") },
      { label: "Interview Rate", value: formatMetricValue(metrics.interviewRate, "%") },
      { label: "Follow-Ups Due", value: formatMetricValue(metrics.followUpsDue) },
    ];
  }, [summary]);

  const statusChartData = useMemo(
    () =>
      summary?.charts.statusDistribution.map((point) => ({
        ...point,
        label: formatJobStatus(point.status),
      })) ?? [],
    [summary]
  );
  const maxStatusCount = Math.max(1, ...statusChartData.map((point) => point.count));
  const maxDailyApplications = Math.max(
    1,
    ...(summary?.charts.dailyApplications.map((point) => point.applications) ?? [])
  );

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function markNotificationRead(notificationId: string) {
    await apiFetch(`/api/notifications/${notificationId}/read`, { method: "POST" });
    setSummary((currentSummary) => {
      if (!currentSummary) {
        return currentSummary;
      }

      const notification = currentSummary.upcomingNotifications.find((item) => item.id === notificationId);
      const shouldReduceFollowUps = notification?.type === "FOLLOW_UP";

      return {
        ...currentSummary,
        metrics: {
          ...currentSummary.metrics,
          followUpsDue: shouldReduceFollowUps
            ? Math.max(0, currentSummary.metrics.followUpsDue - 1)
            : currentSummary.metrics.followUpsDue,
        },
        upcomingNotifications: currentSummary.upcomingNotifications.filter((item) => item.id !== notificationId),
      };
    });
  }

  if (isLoading) {
    return <main className="min-h-screen bg-[#f7f7f4] p-6 text-[#1f2933]">Loading...</main>;
  }

  if (!summary) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#1f2933]">
      <section className="border-b border-[#d9d6cc] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-[#65707a]">Signed in as {user?.email}</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#17212b]">Dashboard</h1>
          </div>
          <button
            className="h-10 rounded-md border border-[#cfcabf] px-4 text-sm font-medium hover:bg-[#f7f7f4]"
            onClick={handleLogout}
            type="button"
          >
            Log out
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pt-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metricCards.map((metric) => (
            <div className="min-h-28 rounded-md border border-[#d9d6cc] bg-white p-4" key={metric.label}>
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#65707a]">{metric.label}</p>
              <p className="mt-4 text-3xl font-semibold text-[#17212b]">{metric.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 pt-4 lg:grid-cols-2">
        <div className="rounded-md border border-[#d9d6cc] bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#17212b]">Application Status</h2>
              <p className="mt-1 text-sm text-[#65707a]">Current outcomes across tracked applications.</p>
            </div>
            <Link className="text-sm font-medium text-[#264653]" href="/applications">
              View tracker
            </Link>
          </div>
          <div className="mt-5 h-72">
            <div className="flex h-full items-end gap-2 border-b border-l border-[#ece8df] px-2 pb-2">
              {statusChartData.map((point) => (
                <div className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2" key={point.status}>
                  <div className="flex min-h-8 items-end justify-center text-xs font-semibold text-[#17212b]">
                    {point.count}
                  </div>
                  <div
                    aria-label={`${point.label}: ${point.count}`}
                    className="rounded-t bg-[#2f6f68]"
                    style={{ height: `${point.count === 0 ? 0 : Math.max(4, (point.count / maxStatusCount) * 190)}px` }}
                    title={`${point.label}: ${point.count}`}
                  />
                  <p className="h-10 truncate text-center text-[11px] leading-4 text-[#65707a]" title={point.label}>
                    {point.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-md border border-[#d9d6cc] bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#17212b]">Applications Over Time</h2>
              <p className="mt-1 text-sm text-[#65707a]">Submitted applications during the last 28 days.</p>
            </div>
            <Link className="text-sm font-medium text-[#264653]" href="/jobs">
              Open jobs
            </Link>
          </div>
          <div className="mt-5 h-72">
            <div className="flex h-full items-end gap-1 border-b border-l border-[#ece8df] px-2 pb-2">
              {summary.charts.dailyApplications.map((point, index) => (
                <div className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2" key={point.date}>
                  <div
                    aria-label={`${formatShortDate(point.date)}: ${point.applications} applications`}
                    className="rounded-t bg-[#8a5f3d]"
                    style={{
                      height: `${point.applications === 0 ? 0 : Math.max(4, (point.applications / maxDailyApplications) * 210)}px`,
                    }}
                    title={`${formatShortDate(point.date)}: ${point.applications} applications`}
                  />
                  <p className="h-5 truncate text-center text-[10px] leading-4 text-[#65707a]">
                    {index % 5 === 0 ? formatShortDate(point.date) : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pt-4">
        <div className="rounded-md border border-[#d9d6cc] bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#17212b]">Upcoming Reminders</h2>
              <p className="mt-1 text-sm text-[#65707a]">Follow-ups, interviews, and assessment deadlines.</p>
            </div>
            <Link className="text-sm font-medium text-[#264653]" href="/applications">
              Manage applications
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {summary.upcomingNotifications.map((notification) => (
              <div className="rounded-md border border-[#e4e0d7] bg-[#fdfdfb] p-4" key={notification.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#17212b]">{notification.title}</p>
                    <p className="mt-1 text-xs text-[#65707a]">{formatNotificationType(notification.type)}</p>
                  </div>
                  <span className="rounded-md bg-[#eef4f2] px-2 py-1 text-xs font-medium text-[#2a6f58]">
                    Open
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#38434f]">{notification.message}</p>
                <p className="mt-2 text-xs text-[#65707a]">
                  Due {notification.dueAt ? formatDate(notification.dueAt) : "No date"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {notification.application ? (
                    <Link className="text-sm font-medium text-[#264653]" href={`/jobs/${notification.application.job.id}`}>
                      Open job
                    </Link>
                  ) : null}
                  <button
                    className="text-sm font-medium text-[#264653]"
                    onClick={() => markNotificationRead(notification.id)}
                    type="button"
                  >
                    Mark read
                  </button>
                </div>
              </div>
            ))}
            {summary.upcomingNotifications.length === 0 ? (
              <p className="rounded-md border border-[#e4e0d7] bg-[#fdfdfb] p-4 text-sm text-[#65707a] md:col-span-3">
                No upcoming reminders.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-6 md:grid-cols-2">
        {navCards.map((card) => (
          <Link className="rounded-md border border-[#d9d6cc] bg-white p-5 hover:border-[#264653]" href={card.href} key={card.href}>
            <h2 className="text-lg font-semibold text-[#17212b]">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#65707a]">{card.body}</p>
          </Link>
        ))}
        <div className="rounded-md border border-[#d9d6cc] bg-white p-5">
          <h2 className="text-lg font-semibold text-[#17212b]">Workflow Status</h2>
          <p className="mt-2 text-sm leading-6 text-[#65707a]">
            Jobs, prompts, focus templates, resume uploads, formatting, validation, resume storage, applications,
            reference files, Gmail detections, reminders, and analytics are available.
          </p>
        </div>
      </section>
    </main>
  );
}
