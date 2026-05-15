"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  formatDate,
  formatJobStatus,
  getEligibilityFlags,
  jobStatusOptions,
  type EligibilityFlags,
  type JobRecord,
} from "@/lib/jobs";

function getRouteId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = getRouteId(params.id);
  const [job, setJob] = useState<JobRecord | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    apiFetch<{ job: JobRecord }>(`/api/jobs/${jobId}`)
      .then((payload) => setJob(payload.job))
      .catch(() => router.push("/jobs"))
      .finally(() => setIsLoading(false));
  }, [jobId, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!job) {
      return;
    }

    setError("");
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await apiFetch<{ job: JobRecord }>(`/api/jobs/${job.id}`, {
        method: "PUT",
        json: {
          status: formData.get("status"),
          notes: formData.get("notes"),
        },
      });
      setJob(response.job);
      setMessage("Job updated");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update job");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!job) {
      return;
    }

    await apiFetch(`/api/jobs/${job.id}`, { method: "DELETE" });
    router.push("/jobs");
  }

  async function handleAnalyzeEligibility() {
    if (!job) {
      return;
    }

    setError("");
    setMessage("");
    setIsAnalyzing(true);

    try {
      const response = await apiFetch<{ analysis: EligibilityFlags; job: JobRecord }>(
        `/api/jobs/${job.id}/analyze-eligibility`,
        { method: "POST" }
      );
      setJob(response.job);
      setMessage(
        response.analysis.passed
          ? "Eligibility check passed"
          : "Eligibility check failed"
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to analyze eligibility");
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (isLoading) {
    return <main className="min-h-screen bg-[#f7f7f4] p-6 text-[#1f2933]">Loading...</main>;
  }

  if (!job) {
    return <main className="min-h-screen bg-[#f7f7f4] p-6 text-[#1f2933]">Job not found.</main>;
  }

  const eligibility = getEligibilityFlags(job);
  const isResumeGenerationBlocked = eligibility.severity === "blocked";

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#1f2933]">
      <section className="border-b border-[#d9d6cc] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link className="text-sm font-medium text-[#264653]" href="/jobs">
              Back to jobs
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-[#17212b]">{job.jobTitle}</h1>
            <p className="mt-1 text-sm text-[#65707a]">
              {job.companyName} {job.location ? `- ${job.location}` : ""}
            </p>
          </div>
          {job.jobUrl ? (
            <a
              className="inline-flex h-10 items-center justify-center rounded-md border border-[#cfcabf] px-4 text-sm font-medium hover:bg-[#f7f7f4]"
              href={job.jobUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open posting
            </a>
          ) : null}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="rounded-md border border-[#d9d6cc] bg-white p-5">
            <h2 className="text-lg font-semibold text-[#17212b]">Job description</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#38434f]">
              {job.jobDescription}
            </p>
          </section>

          <section className="rounded-md border border-[#d9d6cc] bg-white p-5">
            <h2 className="text-lg font-semibold text-[#17212b]">Generated resumes</h2>
            <p className="mt-2 text-sm text-[#65707a]">
              {job._count.resumeVersions} resume version{job._count.resumeVersions === 1 ? "" : "s"} linked to this job.
            </p>
            <button
              className="mt-4 h-10 rounded-md bg-[#264653] px-4 text-sm font-medium text-white hover:bg-[#1f3944] disabled:cursor-not-allowed disabled:bg-[#9ca3af]"
              disabled={isResumeGenerationBlocked}
              type="button"
            >
              Generate resume
            </button>
            {isResumeGenerationBlocked ? (
              <p className="mt-3 text-sm leading-6 text-[#b42318]">
                Resume generation is blocked for this job until a manual override workflow is added.
              </p>
            ) : null}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-md border border-[#d9d6cc] bg-white p-5">
            <h2 className="text-lg font-semibold text-[#17212b]">Status</h2>
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium">
                Job Status
                <select
                  className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
                  defaultValue={job.status}
                  name="status"
                >
                  {jobStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Notes
                <textarea
                  className="mt-1 min-h-32 w-full rounded-md border border-[#cfcabf] px-3 py-2 outline-none focus:border-[#264653]"
                  defaultValue={job.notes ?? ""}
                  name="notes"
                />
              </label>
              {error ? <p className="text-sm text-[#b42318]">{error}</p> : null}
              {message ? <p className="text-sm text-[#2a6f58]">{message}</p> : null}
              <button
                className="h-10 rounded-md bg-[#264653] px-4 text-sm font-medium text-white hover:bg-[#1f3944] disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Saving..." : "Save changes"}
              </button>
            </form>
          </section>

          <section className="rounded-md border border-[#d9d6cc] bg-white p-5">
            <h2 className="text-lg font-semibold text-[#17212b]">Analysis</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[#65707a]">Current status</dt>
                <dd className="font-medium text-[#17212b]">{formatJobStatus(job.status)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#65707a]">Application status</dt>
                <dd className="font-medium text-[#17212b]">{formatJobStatus(job.status)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#65707a]">Eligibility result</dt>
                <dd className={eligibility.passed ? "font-medium text-[#2a6f58]" : "font-medium text-[#b42318]"}>
                  {eligibility.passed ? "Passed" : "Failed"}
                </dd>
              </div>
              {!eligibility.passed ? (
                <div className="rounded-md border border-[#f4b5ad] bg-[#fff5f5] p-3">
                  <dt className="font-medium text-[#b42318]">Restricted terms found</dt>
                  <dd className="mt-2 text-[#7a271a]">
                    {eligibility.restrictedTermsFound.join(", ")}
                  </dd>
                  <p className="mt-2 text-[#7a271a]">
                    Resume generation is blocked for this job.
                  </p>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-[#65707a]">Recommended focus</dt>
                <dd className="font-medium text-[#17212b]">
                  {job.recommendedFocusTemplate?.name ?? "Not analyzed"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#65707a]">Date added</dt>
                <dd className="font-medium text-[#17212b]">{formatDate(job.createdAt)}</dd>
              </div>
            </dl>
            <button
              className="mt-4 h-10 w-full rounded-md border border-[#cfcabf] px-4 text-sm font-medium hover:bg-[#f7f7f4] disabled:opacity-60"
              disabled={isAnalyzing}
              onClick={handleAnalyzeEligibility}
              type="button"
            >
              {isAnalyzing ? "Checking..." : "Run eligibility check"}
            </button>
          </section>

          <button
            className="h-10 w-full rounded-md border border-[#b42318] px-4 text-sm font-medium text-[#b42318] hover:bg-[#fff5f5]"
            onClick={handleDelete}
            type="button"
          >
            Delete job
          </button>
        </aside>
      </section>
    </main>
  );
}
