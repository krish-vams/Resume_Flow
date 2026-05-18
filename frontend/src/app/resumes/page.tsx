"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";
import { formatDate, formatJobStatus } from "@/lib/jobs";
import { formatFocusType } from "@/lib/focus-templates";
import {
  downloadResumeFile,
  formatValidationStatus,
  type ResumeVersionRecord,
} from "@/lib/resumes";

type Filters = {
  company: string;
  role: string;
  focusType: string;
  applicationStatus: string;
  validationStatus: string;
  dateFrom: string;
  dateTo: string;
};

const emptyFilters: Filters = {
  company: "",
  role: "",
  focusType: "",
  applicationStatus: "",
  validationStatus: "",
  dateFrom: "",
  dateTo: "",
};

function isString(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length > 0;
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

export default function ResumesPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeVersionRecord[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ resumes: ResumeVersionRecord[] }>("/api/resumes")
      .then((payload) => setResumes(payload.resumes))
      .catch(() => router.push("/login"))
      .finally(() => setIsLoading(false));
  }, [router]);

  const focusTypes = useMemo(
    () => Array.from(new Set(resumes.map((resume) => resume.focusTemplate?.focusType).filter(isString))),
    [resumes]
  );
  const applicationStatuses = useMemo(
    () => Array.from(new Set(resumes.map((resume) => resume.job.status).filter(isString))),
    [resumes]
  );
  const validationStatuses = useMemo(
    () => Array.from(new Set(resumes.map((resume) => resume.validationStatus).filter(Boolean))),
    [resumes]
  );
  const filteredResumes = useMemo(() => {
    return resumes.filter((resume) => {
      const createdAt = new Date(resume.createdAt);
      const dateFrom = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
      const dateTo = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`) : null;

      return (
        (!filters.company || resume.job.companyName.toLowerCase().includes(filters.company.toLowerCase())) &&
        (!filters.role || resume.job.jobTitle.toLowerCase().includes(filters.role.toLowerCase())) &&
        (!filters.focusType || resume.focusTemplate?.focusType === filters.focusType) &&
        (!filters.applicationStatus || resume.job.status === filters.applicationStatus) &&
        (!filters.validationStatus || resume.validationStatus === filters.validationStatus) &&
        (!dateFrom || createdAt >= dateFrom) &&
        (!dateTo || createdAt <= dateTo)
      );
    });
  }, [filters, resumes]);

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((currentFilters) => ({ ...currentFilters, [key]: value }));
  }

  async function handleDownload(resume: ResumeVersionRecord, kind: "raw" | "formatted" | "pdf") {
    setError("");

    try {
      await downloadFile(resume, kind);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to download resume");
    }
  }

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
            <h1 className="mt-2 text-2xl font-semibold text-[#17212b]">Resume Library</h1>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#264653] px-4 text-sm font-medium text-white hover:bg-[#1f3944]"
            href="/jobs"
          >
            Jobs
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-6">
        <div className="grid gap-3 rounded-md border border-[#d9d6cc] bg-white p-4 md:grid-cols-3 lg:grid-cols-6">
          <label className="block text-sm font-medium">
            Company
            <input
              className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
              onChange={(event) => updateFilter("company", event.target.value)}
              value={filters.company}
            />
          </label>
          <label className="block text-sm font-medium">
            Role
            <input
              className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
              onChange={(event) => updateFilter("role", event.target.value)}
              value={filters.role}
            />
          </label>
          <label className="block text-sm font-medium">
            Focus Type
            <select
              className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
              onChange={(event) => updateFilter("focusType", event.target.value)}
              value={filters.focusType}
            >
              <option value="">All</option>
              {focusTypes.map((focusType) => (
                <option key={focusType} value={focusType}>
                  {formatFocusType(focusType)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Application Status
            <select
              className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
              onChange={(event) => updateFilter("applicationStatus", event.target.value)}
              value={filters.applicationStatus}
            >
              <option value="">All</option>
              {applicationStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatJobStatus(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Validation
            <select
              className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
              onChange={(event) => updateFilter("validationStatus", event.target.value)}
              value={filters.validationStatus}
            >
              <option value="">All</option>
              {validationStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatValidationStatus(status)}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm font-medium">
              From
              <input
                className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-2 outline-none focus:border-[#264653]"
                onChange={(event) => updateFilter("dateFrom", event.target.value)}
                type="date"
                value={filters.dateFrom}
              />
            </label>
            <label className="block text-sm font-medium">
              To
              <input
                className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-2 outline-none focus:border-[#264653]"
                onChange={(event) => updateFilter("dateTo", event.target.value)}
                type="date"
                value={filters.dateTo}
              />
            </label>
          </div>
          <div className="md:col-span-3 lg:col-span-6">
            <button
              className="h-10 rounded-md border border-[#cfcabf] px-4 text-sm font-medium hover:bg-[#f7f7f4]"
              onClick={() => setFilters(emptyFilters)}
              type="button"
            >
              Clear filters
            </button>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-[#b42318]">{error}</p> : null}

        <div className="mt-5 overflow-x-auto rounded-md border border-[#d9d6cc] bg-white">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-[#f0efeb] text-[#38434f]">
              <tr>
                <th className="px-4 py-3 font-semibold">Resume Name</th>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Focus Type</th>
                <th className="px-4 py-3 font-semibold">Version</th>
                <th className="px-4 py-3 font-semibold">Validation</th>
                <th className="px-4 py-3 font-semibold">Match Score</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">DOCX</th>
                <th className="px-4 py-3 font-semibold">PDF</th>
              </tr>
            </thead>
            <tbody>
              {filteredResumes.map((resume) => (
                <tr className="border-t border-[#e8e3d8]" key={resume.id}>
                  <td className="px-4 py-3">
                    <Link className="font-medium text-[#264653] hover:underline" href={`/resumes/${resume.id}`}>
                      {resume.resumeName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{resume.job.companyName}</td>
                  <td className="px-4 py-3">{resume.job.jobTitle}</td>
                  <td className="px-4 py-3">{resume.focusTemplate ? formatFocusType(resume.focusTemplate.focusType) : "None"}</td>
                  <td className="px-4 py-3">v{resume.version}</td>
                  <td className="px-4 py-3">{formatValidationStatus(resume.validationStatus)}</td>
                  <td className="px-4 py-3">{resume.matchScore ?? "Not scored"}</td>
                  <td className="px-4 py-3">{formatDate(resume.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      className="h-9 rounded-md border border-[#cfcabf] px-3 font-medium hover:bg-[#f7f7f4] disabled:opacity-60"
                      disabled={!resume.formattedDocxUrl}
                      onClick={() => handleDownload(resume, "formatted")}
                      type="button"
                    >
                      DOCX
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="h-9 rounded-md border border-[#cfcabf] px-3 font-medium disabled:opacity-60"
                      disabled={!resume.formattedPdfUrl}
                      onClick={() => handleDownload(resume, "pdf")}
                      type="button"
                    >
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
              {filteredResumes.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-[#65707a]" colSpan={10}>
                    No resumes match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
