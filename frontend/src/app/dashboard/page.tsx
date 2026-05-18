"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/jobs";
import { formatNotificationType, type NotificationRecord } from "@/lib/notifications";

type User = {
  id: string;
  name: string;
  email: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<{ user: User }>("/api/auth/me"),
      apiFetch<{ notifications: NotificationRecord[] }>("/api/notifications?upcomingOnly=true&limit=6"),
    ])
      .then(([userPayload, notificationPayload]) => {
        setUser(userPayload.user);
        setNotifications(notificationPayload.notifications);
      })
      .catch(() => router.push("/login"))
      .finally(() => setIsLoading(false));
  }, [router]);

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function markNotificationRead(notificationId: string) {
    await apiFetch(`/api/notifications/${notificationId}/read`, { method: "POST" });
    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification
      )
    );
  }

  if (isLoading) {
    return <main className="min-h-screen bg-[#f7f7f4] p-6 text-[#1f2933]">Loading...</main>;
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
        <div className="rounded-md border border-[#d9d6cc] bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#17212b]">Upcoming reminders</h2>
              <p className="mt-1 text-sm text-[#65707a]">Follow-ups, interviews, and assessment deadlines.</p>
            </div>
            <Link className="text-sm font-medium text-[#264653]" href="/applications">
              Manage applications
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {notifications.map((notification) => (
              <div className="rounded-md border border-[#e4e0d7] bg-[#fdfdfb] p-4" key={notification.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#17212b]">{notification.title}</p>
                    <p className="mt-1 text-xs text-[#65707a]">{formatNotificationType(notification.type)}</p>
                  </div>
                  {notification.read ? (
                    <span className="rounded-md bg-[#eef4f2] px-2 py-1 text-xs font-medium text-[#2a6f58]">Read</span>
                  ) : null}
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
                  {!notification.read ? (
                    <button
                      className="text-sm font-medium text-[#264653]"
                      onClick={() => markNotificationRead(notification.id)}
                      type="button"
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            {notifications.length === 0 ? (
              <p className="rounded-md border border-[#e4e0d7] bg-[#fdfdfb] p-4 text-sm text-[#65707a] md:col-span-3">
                No upcoming reminders.
              </p>
            ) : null}
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-6 md:grid-cols-2">
        <Link
          className="rounded-md border border-[#d9d6cc] bg-white p-5 hover:border-[#264653]"
          href="/jobs"
        >
          <h2 className="text-lg font-semibold text-[#17212b]">Jobs</h2>
          <p className="mt-2 text-sm leading-6 text-[#65707a]">
            Save job descriptions, track status, and keep each generated resume connected to its source JD.
          </p>
        </Link>
        <Link
          className="rounded-md border border-[#d9d6cc] bg-white p-5 hover:border-[#264653]"
          href="/settings/profile"
        >
          <h2 className="text-lg font-semibold text-[#17212b]">Candidate profile</h2>
          <p className="mt-2 text-sm leading-6 text-[#65707a]">
            Store contact details, education, certifications, and the default resume output name.
          </p>
        </Link>
        <Link
          className="rounded-md border border-[#d9d6cc] bg-white p-5 hover:border-[#264653]"
          href="/prompts"
        >
          <h2 className="text-lg font-semibold text-[#17212b]">Prompt Library</h2>
          <p className="mt-2 text-sm leading-6 text-[#65707a]">
            Save Gemini prompt templates, version edits, duplicate variants, and assemble final prompts.
          </p>
        </Link>
        <Link
          className="rounded-md border border-[#d9d6cc] bg-white p-5 hover:border-[#264653]"
          href="/focus-templates"
        >
          <h2 className="text-lg font-semibold text-[#17212b]">Focus Templates</h2>
          <p className="mt-2 text-sm leading-6 text-[#65707a]">
            Manage stack-specific resume strategies for Java, .NET, Node.js, Go, AI, cloud, and full-stack roles.
          </p>
        </Link>
        <Link
          className="rounded-md border border-[#d9d6cc] bg-white p-5 hover:border-[#264653]"
          href="/resumes"
        >
          <h2 className="text-lg font-semibold text-[#17212b]">Resume Library</h2>
          <p className="mt-2 text-sm leading-6 text-[#65707a]">
            Find generated resumes by company, role, focus type, validation status, and application status.
          </p>
        </Link>
        <Link
          className="rounded-md border border-[#d9d6cc] bg-white p-5 hover:border-[#264653]"
          href="/applications"
        >
          <h2 className="text-lg font-semibold text-[#17212b]">Application Tracker</h2>
          <p className="mt-2 text-sm leading-6 text-[#65707a]">
            Track applied jobs, resumes used, recruiters, interviews, follow-ups, and outcomes.
          </p>
        </Link>
        <Link
          className="rounded-md border border-[#d9d6cc] bg-white p-5 hover:border-[#264653]"
          href="/reference-library"
        >
          <h2 className="text-lg font-semibold text-[#17212b]">Reference Library</h2>
          <p className="mt-2 text-sm leading-6 text-[#65707a]">
            Upload Excel writing guides, parse reference rows, search examples, and use selected context in prompts.
          </p>
        </Link>
        <Link
          className="rounded-md border border-[#d9d6cc] bg-white p-5 hover:border-[#264653]"
          href="/gmail"
        >
          <h2 className="text-lg font-semibold text-[#17212b]">Gmail Job Emails</h2>
          <p className="mt-2 text-sm leading-6 text-[#65707a]">
            Connect Gmail, scan job-related emails, and confirm recruiter, interview, assessment, or rejection updates.
          </p>
        </Link>
        <div className="rounded-md border border-[#d9d6cc] bg-white p-5">
          <h2 className="text-lg font-semibold text-[#17212b]">Workflow status</h2>
          <p className="mt-2 text-sm leading-6 text-[#65707a]">
            Jobs, prompts, focus templates, resume uploads, formatting, validation, resume storage, applications,
            and reference files are available.
          </p>
        </div>
      </section>
    </main>
  );
}
