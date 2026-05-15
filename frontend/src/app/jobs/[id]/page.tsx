"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { API_URL, apiFetch, apiFormFetch } from "@/lib/api";
import {
  formatDate,
  formatJobStatus,
  getEligibilityFlags,
  jobStatusOptions,
  type ExtractedKeywords,
  type EligibilityFlags,
  type FocusRecommendation,
  type JobRecord,
} from "@/lib/jobs";
import type { ResumeFocusTemplate } from "@/lib/focus-templates";
import type { PromptTemplate } from "@/lib/prompts";
import {
  formatResumeStatus,
  type CandidateProfileSummary,
  type ResumeVersionRecord,
} from "@/lib/resumes";

function getRouteId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = getRouteId(params.id);
  const [job, setJob] = useState<JobRecord | null>(null);
  const [focusTemplates, setFocusTemplates] = useState<ResumeFocusTemplate[]>([]);
  const [candidateProfiles, setCandidateProfiles] = useState<CandidateProfileSummary[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [resumes, setResumes] = useState<ResumeVersionRecord[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    Promise.all([
      apiFetch<{ job: JobRecord }>(`/api/jobs/${jobId}`),
      apiFetch<{ focusTemplates: ResumeFocusTemplate[] }>("/api/focus-templates"),
      apiFetch<{ profiles: CandidateProfileSummary[] }>("/api/candidate-profiles"),
      apiFetch<{ prompts: PromptTemplate[] }>("/api/prompts"),
      apiFetch<{ resumes: ResumeVersionRecord[] }>(`/api/resumes?jobId=${jobId}`),
    ])
      .then(([jobPayload, focusTemplatePayload, candidateProfilePayload, promptPayload, resumePayload]) => {
        setJob(jobPayload.job);
        setFocusTemplates(focusTemplatePayload.focusTemplates);
        setCandidateProfiles(candidateProfilePayload.profiles);
        setPrompts(promptPayload.prompts);
        setResumes(resumePayload.resumes);
      })
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
          recommendedFocusTemplateId: formData.get("recommendedFocusTemplateId") || null,
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

  async function handleAnalyzeJob() {
    if (!job) {
      return;
    }

    setError("");
    setMessage("");
    setIsAnalyzing(true);

    try {
      const response = await apiFetch<{
        eligibility: EligibilityFlags;
        extractedKeywords: ExtractedKeywords;
        focusRecommendation: FocusRecommendation;
        job: JobRecord;
      }>(`/api/jobs/${job.id}/analyze`, { method: "POST" });
      setJob(response.job);
      setMessage(`Recommended focus: ${response.focusRecommendation.recommendedFocus}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to analyze job");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleUploadRawResume(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!job) {
      return;
    }

    setError("");
    setMessage("");
    setIsUploading(true);

    const uploadForm = event.currentTarget;
    const formData = new FormData(uploadForm);
    formData.set("jobId", job.id);

    try {
      const response = await apiFormFetch<{ resume: ResumeVersionRecord }>("/api/resumes/upload-raw", formData);
      setResumes((currentResumes) => [response.resume, ...currentResumes]);
      setJob((currentJob) =>
        currentJob
          ? {
              ...currentJob,
              status: "RESUME_GENERATED",
              _count: {
                ...currentJob._count,
                resumeVersions: currentJob._count.resumeVersions + 1,
              },
            }
          : currentJob
      );
      uploadForm.reset();
      setMessage(`Raw resume v${response.resume.version} uploaded`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to upload raw resume");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownloadResume(resume: ResumeVersionRecord) {
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/resumes/${resume.id}/download-raw`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(response.statusText || "Unable to download raw resume");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${resume.resumeName.replace(/[^a-zA-Z0-9._-]/g, "-")}-v${resume.version}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to download raw resume");
    }
  }

  async function handleDeleteResume(resume: ResumeVersionRecord) {
    setError("");
    setMessage("");

    try {
      await apiFetch(`/api/resumes/${resume.id}`, { method: "DELETE" });
      setResumes((currentResumes) => currentResumes.filter((currentResume) => currentResume.id !== resume.id));
      setJob((currentJob) =>
        currentJob
          ? {
              ...currentJob,
              _count: {
                ...currentJob._count,
                resumeVersions: Math.max(0, currentJob._count.resumeVersions - 1),
              },
            }
          : currentJob
      );
      setMessage(`Raw resume v${resume.version} deleted`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to delete raw resume");
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
  const focusRecommendation = job.focusRecommendationJson;
  const extractedKeywords = job.jdKeywordsJson;
  const primaryCandidateProfile = candidateProfiles[0];
  const defaultResumeName =
    primaryCandidateProfile?.defaultResumeName ??
    `${job.companyName}_${job.jobTitle}`.replace(/[^a-zA-Z0-9._-]/g, "_");

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
              {resumes.length} resume version{resumes.length === 1 ? "" : "s"} linked to this job.
            </p>

            <form className="mt-5 grid gap-4 rounded-md border border-[#d9d6cc] bg-[#fdfdfb] p-4 md:grid-cols-2" onSubmit={handleUploadRawResume}>
              <label className="block text-sm font-medium">
                Resume Name
                <input
                  className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] bg-white px-3 outline-none focus:border-[#264653]"
                  defaultValue={defaultResumeName}
                  name="resumeName"
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                Raw Resume DOCX
                <input
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] bg-white px-3 py-2 text-sm outline-none file:mr-3 file:rounded-md file:border-0 file:bg-[#e8efed] file:px-3 file:py-1 file:text-sm file:font-medium file:text-[#264653]"
                  name="rawResumeFile"
                  required
                  type="file"
                />
              </label>
              <label className="block text-sm font-medium">
                Candidate Profile
                <select
                  className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] bg-white px-3 outline-none focus:border-[#264653]"
                  defaultValue={primaryCandidateProfile?.id ?? ""}
                  name="candidateProfileId"
                >
                  <option value="">No profile selected</option>
                  {candidateProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.fullName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Prompt Template
                <select
                  className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] bg-white px-3 outline-none focus:border-[#264653]"
                  name="promptTemplateId"
                >
                  <option value="">No prompt selected</option>
                  {prompts.map((prompt) => (
                    <option key={prompt.id} value={prompt.id}>
                      {prompt.name} v{prompt.version}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Focus Template
                <select
                  className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] bg-white px-3 outline-none focus:border-[#264653]"
                  defaultValue={job.recommendedFocusTemplateId ?? ""}
                  name="focusTemplateId"
                >
                  <option value="">No focus selected</option>
                  {focusTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium md:col-span-2">
                Raw Resume Text
                <textarea
                  className="mt-1 min-h-28 w-full rounded-md border border-[#cfcabf] bg-white px-3 py-2 outline-none focus:border-[#264653]"
                  name="rawResumeText"
                />
              </label>
              <div className="md:col-span-2">
                <button
                  className="h-10 rounded-md bg-[#264653] px-4 text-sm font-medium text-white hover:bg-[#1f3944] disabled:cursor-not-allowed disabled:bg-[#9ca3af]"
                  disabled={isResumeGenerationBlocked || isUploading}
                  type="submit"
                >
                  {isUploading ? "Uploading..." : "Upload raw resume"}
                </button>
              </div>
            </form>
            {isResumeGenerationBlocked ? (
              <p className="mt-3 text-sm leading-6 text-[#b42318]">
                Resume generation is blocked for this job until a manual override workflow is added.
              </p>
            ) : null}
            <div className="mt-5 space-y-3">
              {resumes.length === 0 ? (
                <p className="rounded-md border border-[#d9d6cc] bg-[#fdfdfb] p-4 text-sm text-[#65707a]">
                  No raw resumes have been uploaded for this job yet.
                </p>
              ) : (
                resumes.map((resume) => (
                  <div
                    className="flex flex-col gap-3 rounded-md border border-[#d9d6cc] bg-[#fdfdfb] p-4 sm:flex-row sm:items-center sm:justify-between"
                    key={resume.id}
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#17212b]">
                        v{resume.version} - {resume.resumeName}
                      </p>
                      <p className="mt-1 text-sm text-[#65707a]">
                        {formatResumeStatus(resume.status)} - {formatDate(resume.createdAt)}
                      </p>
                      <p className="mt-1 text-sm text-[#65707a]">
                        {[resume.candidateProfile?.fullName, resume.promptTemplate?.name, resume.focusTemplate?.name]
                          .filter(Boolean)
                          .join(" - ") || "No linked profile, prompt, or focus template"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="h-9 rounded-md border border-[#cfcabf] px-3 text-sm font-medium hover:bg-white"
                        onClick={() => handleDownloadResume(resume)}
                        type="button"
                      >
                        Download
                      </button>
                      <button
                        className="h-9 rounded-md border border-[#b42318] px-3 text-sm font-medium text-[#b42318] hover:bg-[#fff5f5]"
                        onClick={() => handleDeleteResume(resume)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
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
              <label className="block text-sm font-medium">
                Recommended Focus
                <select
                  className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
                  defaultValue={job.recommendedFocusTemplateId ?? ""}
                  key={job.recommendedFocusTemplateId ?? "none"}
                  name="recommendedFocusTemplateId"
                >
                  <option value="">No focus selected</option>
                  {focusTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
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
              {focusRecommendation ? (
                <div className="rounded-md border border-[#d9d6cc] bg-[#fdfdfb] p-3">
                  <dt className="font-medium text-[#17212b]">
                    Confidence: {focusRecommendation.confidence}%
                  </dt>
                  <dd className="mt-2 text-[#65707a]">{focusRecommendation.reason}</dd>
                  {focusRecommendation.matchedKeywords.length > 0 ? (
                    <p className="mt-2 text-[#65707a]">
                      Matched: {focusRecommendation.matchedKeywords.join(", ")}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {extractedKeywords?.all.length ? (
                <div className="rounded-md border border-[#d9d6cc] bg-[#fdfdfb] p-3">
                  <dt className="font-medium text-[#17212b]">Extracted keywords</dt>
                  <dd className="mt-2 text-[#65707a]">{extractedKeywords.all.join(", ")}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-[#65707a]">Date added</dt>
                <dd className="font-medium text-[#17212b]">{formatDate(job.createdAt)}</dd>
              </div>
            </dl>
            <button
              className="mt-4 h-10 w-full rounded-md border border-[#cfcabf] px-4 text-sm font-medium hover:bg-[#f7f7f4] disabled:opacity-60"
              disabled={isAnalyzing}
              onClick={handleAnalyzeJob}
              type="button"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze JD"}
            </button>
            <button
              className="mt-3 h-10 w-full rounded-md border border-[#cfcabf] px-4 text-sm font-medium hover:bg-[#f7f7f4] disabled:opacity-60"
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
