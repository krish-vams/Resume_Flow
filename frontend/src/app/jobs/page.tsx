"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatDate, formatJobStatus, type JobRecord } from "@/lib/jobs";

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ jobs: JobRecord[] }>("/api/jobs")
      .then((payload) => setJobs(payload.jobs))
      .catch(() => router.push("/login"))
      .finally(() => setIsLoading(false));
  }, [router]);

  if (isLoading) {
    return <main className="min-h-screen bg-[#f7f7f4] p-6 text-[#1f2933]">Loading...</main>;
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#1f2933]">
      <section className="border-b border-[#d9d6cc] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link className="text-sm font-medium text-[#264653]" href="/dashboard">
              Back to dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-[#17212b]">Jobs</h1>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#264653] px-4 text-sm font-medium text-white hover:bg-[#1f3944]"
            href="/jobs/new"
          >
            Add job
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-6">
        <div className="overflow-hidden rounded-md border border-[#d9d6cc] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead className="bg-[#f7f7f4] text-[#65707a]">
                <tr>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date Added</th>
                  <th className="px-4 py-3 font-medium">Recommended Focus</th>
                  <th className="px-4 py-3 font-medium">Resume Count</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr className="border-t border-[#eeeae0]" key={job.id}>
                    <td className="px-4 py-3 font-medium text-[#17212b]">{job.companyName}</td>
                    <td className="px-4 py-3">{job.jobTitle}</td>
                    <td className="px-4 py-3">{formatJobStatus(job.status)}</td>
                    <td className="px-4 py-3">{formatDate(job.createdAt)}</td>
                    <td className="px-4 py-3">
                      {job.recommendedFocusTemplate?.name ?? "Not analyzed"}
                    </td>
                    <td className="px-4 py-3">{job._count.resumeVersions}</td>
                    <td className="px-4 py-3">
                      <Link className="font-medium text-[#264653]" href={`/jobs/${job.id}`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-[#65707a]" colSpan={7}>
                      No jobs saved yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
