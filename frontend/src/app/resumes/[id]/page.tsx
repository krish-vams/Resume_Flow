"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";
import { formatDate, formatJobStatus } from "@/lib/jobs";
import { formatFocusType } from "@/lib/focus-templates";
import {
  downloadResumeFile,
  formatResumeStatus,
  formatValidationStatus,
  type ResumeMatchCoverage,
  type ResumeVersionRecord,
} from "@/lib/resumes";

function getRouteId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function downloadFile(resume: ResumeVersionRecord, kind: "raw" | "formatted" | "pdf") {
  const target = downloadResumeFile(resume, kind);
  const response = await fetch(`${API_URL}${target.path}`, { credentials: "include" });

  if (!response.ok) {
    throw new Error(response.statusText || "Unable to download resume");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = target.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function listValues(values: string[] | null | undefined) {
  return values && values.length > 0 ? values.join(", ") : "None";
}

function CoverageBlock({ label, coverage }: { label: string; coverage?: ResumeMatchCoverage | null }) {
  if (!coverage) {
    return null;
  }

  return (
    <div className="rounded-md border border-[#d9d6cc] bg-[#fdfdfb] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-[#17212b]">{label}</p>
        <span className="rounded-md bg-[#eef4f2] px-2 py-1 text-xs font-medium text-[#264653]">
          {coverage.coverage}%
        </span>
      </div>
      <p className="mt-2 text-sm text-[#2a6f58]">Matched: {listValues(coverage.matched)}</p>
      <p className="mt-1 text-sm text-[#b42318]">Missing: {listValues(coverage.missing)}</p>
    </div>
  );
}

export default function ResumeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const resumeId = getRouteId(params.id);
  const [resume, setResume] = useState<ResumeVersionRecord | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzingMatch, setIsAnalyzingMatch] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    if (!resumeId) {
      return;
    }

    apiFetch<{ resume: ResumeVersionRecord }>(`/api/resumes/${resumeId}`)
      .then((payload) => setResume(payload.resume))
      .catch(() => router.push("/resumes"))
      .finally(() => setIsLoading(false));
  }, [resumeId, router]);

  async function handleDownload(kind: "raw" | "formatted" | "pdf") {
    if (!resume) {
      return;
    }

    setError("");

    try {
      await downloadFile(resume, kind);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to download resume");
    }
  }

  async function handleExportPdf() {
    if (!resume) {
      return;
    }

    setError("");
    setMessage("");
    setIsExportingPdf(true);

    try {
      const response = await apiFetch<{ resume: ResumeVersionRecord }>(`/api/resumes/${resume.id}/export-pdf`, {
        method: "POST",
      });
      setResume(response.resume);
      setMessage("PDF export is ready");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to export PDF");
    } finally {
      setIsExportingPdf(false);
    }
  }

  async function handleAnalyzeMatch() {
    if (!resume) {
      return;
    }

    setError("");
    setMessage("");
    setIsAnalyzingMatch(true);

    try {
      const response = await apiFetch<{ resume: ResumeVersionRecord }>(`/api/resumes/${resume.id}/analyze-match`, {
        method: "POST",
      });
      setResume(response.resume);
      setMessage("Match analysis saved");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to analyze match");
    } finally {
      setIsAnalyzingMatch(false);
    }
  }

  if (isLoading) {
    return <main className="min-h-screen bg-[#f7f7f4] p-6 text-[#1f2933]">Loading...</main>;
  }

  if (!resume) {
    return <main className="min-h-screen bg-[#f7f7f4] p-6 text-[#1f2933]">Resume not found.</main>;
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#1f2933]">
      <section className="border-b border-[#d9d6cc] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link className="text-sm font-medium text-[#264653]" href="/resumes">
              Back to resume library
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-[#17212b]">{resume.resumeName}</h1>
            <p className="mt-1 text-sm text-[#65707a]">
              {resume.job.companyName} - {resume.job.jobTitle} - v{resume.version}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="h-10 rounded-md border border-[#cfcabf] px-4 text-sm font-medium hover:bg-[#f7f7f4]"
              onClick={() => handleDownload("raw")}
              type="button"
            >
              Raw DOCX
            </button>
            <button
              className="h-10 rounded-md bg-[#264653] px-4 text-sm font-medium text-white hover:bg-[#1f3944] disabled:bg-[#9ca3af]"
              disabled={!resume.formattedDocxUrl}
              onClick={() => handleDownload("formatted")}
              type="button"
            >
              Formatted DOCX
            </button>
            <button
              className="h-10 rounded-md border border-[#cfcabf] px-4 text-sm font-medium hover:bg-[#f7f7f4] disabled:opacity-60"
              disabled={!resume.formattedPdfUrl}
              onClick={() => handleDownload("pdf")}
              type="button"
            >
              PDF
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="rounded-md border border-[#d9d6cc] bg-white p-5">
            <h2 className="text-lg font-semibold text-[#17212b]">Raw Resume</h2>
            {resume.rawResumeText ? (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#38434f]">{resume.rawResumeText}</p>
            ) : (
              <p className="mt-4 text-sm text-[#65707a]">Raw resume text was not pasted for this version. Use the Raw DOCX download.</p>
            )}
          </section>

          <section className="rounded-md border border-[#d9d6cc] bg-white p-5">
            <h2 className="text-lg font-semibold text-[#17212b]">Job Description</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#38434f]">
              {resume.job.jobDescription || "No job description stored."}
            </p>
          </section>

          <section className="rounded-md border border-[#d9d6cc] bg-white p-5">
            <h2 className="text-lg font-semibold text-[#17212b]">Validation Report</h2>
            {resume.validation ? (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="rounded-md bg-[#eef4f2] px-3 py-2 font-medium text-[#264653]">
                    {formatValidationStatus(resume.validation.overallStatus)}
                  </span>
                  <span className="rounded-md bg-[#f0efeb] px-3 py-2 font-medium text-[#38434f]">
                    Score {resume.validation.overallScore ?? 0}
                  </span>
                  <span className="rounded-md bg-[#f0efeb] px-3 py-2 font-medium text-[#38434f]">
                    {formatDate(resume.validation.createdAt)}
                  </span>
                </div>
                <div className="grid gap-2">
                  {(resume.validation.checksJson ?? []).map((check) => (
                    <div className="rounded-md border border-[#d9d6cc] bg-[#fdfdfb] p-3" key={check.name}>
                      <p className="text-sm font-medium text-[#17212b]">
                        {check.name}: {formatResumeStatus(check.status)}
                      </p>
                      <p className="mt-1 text-sm text-[#65707a]">{check.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#65707a]">No validation report has been run for this resume.</p>
            )}
          </section>

          <section className="rounded-md border border-[#d9d6cc] bg-white p-5">
            <h2 className="text-lg font-semibold text-[#17212b]">Prompt Used</h2>
            {resume.promptTemplate ? (
              <>
                <p className="mt-2 text-sm font-medium text-[#17212b]">
                  {resume.promptTemplate.name} v{resume.promptTemplate.version}
                </p>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#38434f]">
                  {resume.promptTemplate.promptText || "Prompt text is not available."}
                </p>
              </>
            ) : (
              <p className="mt-4 text-sm text-[#65707a]">No prompt template was linked to this resume.</p>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          {error ? <p className="rounded-md border border-[#f4b5ad] bg-[#fff5f5] p-4 text-sm text-[#b42318]">{error}</p> : null}
          {message ? <p className="rounded-md border border-[#b7dfc9] bg-[#f2faf5] p-4 text-sm text-[#2a6f58]">{message}</p> : null}

          <section className="rounded-md border border-[#d9d6cc] bg-white p-5">
            <h2 className="text-lg font-semibold text-[#17212b]">Resume Files</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[#65707a]">Raw DOCX</dt>
                <dd className="font-medium text-[#17212b]">{resume.rawResumeFileUrl ? "Available" : "Missing"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#65707a]">Formatted DOCX</dt>
                <dd className="font-medium text-[#17212b]">{resume.formattedDocxUrl ? "Available" : "Missing"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#65707a]">PDF</dt>
                <dd className="font-medium text-[#17212b]">{resume.formattedPdfUrl ? "Available" : "Not generated"}</dd>
              </div>
            </dl>
            <button
              className="mt-4 h-10 w-full rounded-md border border-[#cfcabf] px-4 text-sm font-medium hover:bg-[#f7f7f4] disabled:opacity-60"
              disabled={!resume.formattedDocxUrl || isExportingPdf}
              onClick={handleExportPdf}
              type="button"
            >
              {isExportingPdf ? "Exporting..." : "Export PDF"}
            </button>
            <button
              className="mt-3 h-10 w-full rounded-md bg-[#264653] px-4 text-sm font-medium text-white hover:bg-[#1f3944] disabled:bg-[#9ca3af]"
              disabled={!resume.formattedPdfUrl}
              onClick={() => handleDownload("pdf")}
              type="button"
            >
              Download PDF
            </button>
          </section>

          <section className="rounded-md border border-[#d9d6cc] bg-white p-5">
            <h2 className="text-lg font-semibold text-[#17212b]">Resume Metadata</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[#65707a]">Status</dt>
                <dd className="font-medium text-[#17212b]">{formatResumeStatus(resume.status)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#65707a]">Validation</dt>
                <dd className="font-medium text-[#17212b]">{formatValidationStatus(resume.validationStatus)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#65707a]">Match Score</dt>
                <dd className="font-medium text-[#17212b]">{resume.matchScore ?? "Not scored"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#65707a]">Created</dt>
                <dd className="font-medium text-[#17212b]">{formatDate(resume.createdAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-md border border-[#d9d6cc] bg-white p-5">
            <h2 className="text-lg font-semibold text-[#17212b]">Application Status</h2>
            <p className="mt-3 text-sm font-medium text-[#17212b]">{formatJobStatus(resume.job.status ?? "SAVED")}</p>
            <Link className="mt-4 inline-flex text-sm font-medium text-[#264653]" href={`/jobs/${resume.job.id}`}>
              Open related job
            </Link>
          </section>

          <section className="rounded-md border border-[#d9d6cc] bg-white p-5">
            <h2 className="text-lg font-semibold text-[#17212b]">Focus Template</h2>
            {resume.focusTemplate ? (
              <div className="mt-3 text-sm text-[#38434f]">
                <p className="font-medium text-[#17212b]">{resume.focusTemplate.name}</p>
                <p className="mt-1">{formatFocusType(resume.focusTemplate.focusType)}</p>
                <p className="mt-1">{resume.focusTemplate.primaryLanguage || "No primary language"}</p>
                <p className="mt-3 leading-6 text-[#65707a]">{resume.focusTemplate.description || "No description"}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#65707a]">No focus template was linked.</p>
            )}
          </section>

          <section className="rounded-md border border-[#d9d6cc] bg-white p-5">
            <h2 className="text-lg font-semibold text-[#17212b]">Match Analysis</h2>
            <button
              className="mt-4 h-10 w-full rounded-md bg-[#264653] px-4 text-sm font-medium text-white hover:bg-[#1f3944] disabled:opacity-60"
              disabled={isAnalyzingMatch}
              onClick={handleAnalyzeMatch}
              type="button"
            >
              {isAnalyzingMatch ? "Analyzing..." : "Analyze match"}
            </button>
            {resume.matchAnalysis ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-md bg-[#eef4f2] p-4">
                  <p className="text-sm text-[#65707a]">Overall Match Score</p>
                  <p className="mt-1 text-3xl font-semibold text-[#264653]">{resume.matchAnalysis.matchScore}</p>
                </div>
                <div className="rounded-md border border-[#d9d6cc] bg-[#fdfdfb] p-3 text-sm">
                  <p className="font-medium text-[#17212b]">Required Skills</p>
                  <p className="mt-2 text-[#2a6f58]">Matched: {listValues(resume.matchAnalysis.matchedRequiredSkillsJson)}</p>
                  <p className="mt-1 text-[#b42318]">Missing: {listValues(resume.matchAnalysis.missingRequiredSkillsJson)}</p>
                </div>
                <div className="rounded-md border border-[#d9d6cc] bg-[#fdfdfb] p-3 text-sm">
                  <p className="font-medium text-[#17212b]">Preferred Skills</p>
                  <p className="mt-2 text-[#2a6f58]">Matched: {listValues(resume.matchAnalysis.matchedPreferredSkillsJson)}</p>
                  <p className="mt-1 text-[#b42318]">Missing: {listValues(resume.matchAnalysis.missingPreferredSkillsJson)}</p>
                </div>
                <div className="rounded-md border border-[#d9d6cc] bg-[#fdfdfb] p-3 text-sm">
                  <p className="font-medium text-[#17212b]">Primary Language</p>
                  <p className="mt-2 text-[#38434f]">
                    {resume.matchAnalysis.primaryLanguageAlignmentJson?.primaryLanguage ?? "No primary language detected"} -{" "}
                    {resume.matchAnalysis.primaryLanguageAlignmentJson?.aligned ? "Aligned" : "Needs review"}
                  </p>
                </div>
                <CoverageBlock coverage={resume.matchAnalysis.cloudDevopsCoverageJson} label="Cloud/DevOps Coverage" />
                <CoverageBlock coverage={resume.matchAnalysis.databaseCoverageJson} label="Database Coverage" />
                <CoverageBlock coverage={resume.matchAnalysis.frameworkCoverageJson} label="Framework Coverage" />
                <CoverageBlock coverage={resume.matchAnalysis.referenceKeywordCoverageJson} label="Reference Keyword Coverage" />
                <div className="rounded-md border border-[#d9d6cc] bg-[#fdfdfb] p-3">
                  <p className="text-sm font-medium text-[#17212b]">Suggestions</p>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-[#38434f]">
                    {(resume.matchAnalysis.suggestionsJson ?? []).map((suggestion) => (
                      <li key={suggestion}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#65707a]">Match analysis has not been run yet.</p>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}
