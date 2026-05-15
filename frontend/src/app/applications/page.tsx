"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  applicationStatusOptions,
  dateInputValue,
  formatApplicationStatus,
  type ApplicationRecord,
} from "@/lib/applications";
import { formatDate, type JobRecord } from "@/lib/jobs";
import { formatValidationStatus, type ResumeVersionRecord } from "@/lib/resumes";

function emptyToNull(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [resumes, setResumes] = useState<ResumeVersionRecord[]>([]);
  const [editingApplication, setEditingApplication] = useState<ApplicationRecord | null>(null);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<{ applications: ApplicationRecord[] }>("/api/applications"),
      apiFetch<{ jobs: JobRecord[] }>("/api/jobs"),
      apiFetch<{ resumes: ResumeVersionRecord[] }>("/api/resumes"),
    ])
      .then(([applicationPayload, jobPayload, resumePayload]) => {
        setApplications(applicationPayload.applications);
        setJobs(jobPayload.jobs);
        setResumes(resumePayload.resumes);
      })
      .catch(() => router.push("/login"))
      .finally(() => setIsLoading(false));
  }, [router]);

  const availableResumes = useMemo(
    () => resumes.filter((resume) => !selectedJobId || resume.jobId === selectedJobId),
    [resumes, selectedJobId]
  );

  function startEdit(application: ApplicationRecord) {
    setEditingApplication(application);
    setSelectedJobId(application.jobId);
    setError("");
    setMessage("");
  }

  function resetForm() {
    setEditingApplication(null);
    setSelectedJobId("");
    setError("");
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      jobId: formData.get("jobId"),
      resumeVersionId: emptyToNull(formData.get("resumeVersionId")),
      status: formData.get("status"),
      appliedDate: emptyToNull(formData.get("appliedDate")),
      followUpDate: emptyToNull(formData.get("followUpDate")),
      recruiterName: emptyToNull(formData.get("recruiterName")),
      recruiterEmail: emptyToNull(formData.get("recruiterEmail")),
      interviewDate: emptyToNull(formData.get("interviewDate")),
      notes: emptyToNull(formData.get("notes")),
    };

    try {
      const response = editingApplication
        ? await apiFetch<{ application: ApplicationRecord }>(`/api/applications/${editingApplication.id}`, {
            method: "PUT",
            json: payload,
          })
        : await apiFetch<{ application: ApplicationRecord }>("/api/applications", {
            method: "POST",
            json: payload,
          });

      setApplications((currentApplications) =>
        editingApplication
          ? currentApplications.map((application) =>
              application.id === response.application.id ? response.application : application
            )
          : [response.application, ...currentApplications]
      );
      setMessage(editingApplication ? "Application updated" : "Application added");
      resetForm();
      event.currentTarget.reset();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save application");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(application: ApplicationRecord) {
    setError("");
    setMessage("");

    try {
      await apiFetch(`/api/applications/${application.id}`, { method: "DELETE" });
      setApplications((currentApplications) =>
        currentApplications.filter((currentApplication) => currentApplication.id !== application.id)
      );
      if (editingApplication?.id === application.id) {
        resetForm();
      }
      setMessage("Application deleted");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to delete application");
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
            <h1 className="mt-2 text-2xl font-semibold text-[#17212b]">Application Tracker</h1>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-[#cfcabf] px-4 text-sm font-medium hover:bg-[#f7f7f4]"
            href="/resumes"
          >
            Resume Library
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[380px_1fr]">
        <form
          className="rounded-md border border-[#d9d6cc] bg-white p-5"
          key={editingApplication?.id ?? "new-application"}
          onSubmit={handleSubmit}
        >
          <h2 className="text-lg font-semibold text-[#17212b]">
            {editingApplication ? "Edit application" : "Add application"}
          </h2>
          <div className="mt-4 space-y-4">
            <label className="block text-sm font-medium">
              Job
              <select
                className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
                defaultValue={editingApplication?.jobId ?? ""}
                name="jobId"
                onChange={(event) => setSelectedJobId(event.target.value)}
                required
              >
                <option value="">Select job</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.companyName} - {job.jobTitle}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Resume Used
              <select
                className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
                defaultValue={editingApplication?.resumeVersionId ?? ""}
                key={`${editingApplication?.id ?? "new"}-${selectedJobId}`}
                name="resumeVersionId"
              >
                <option value="">No resume selected</option>
                {availableResumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.resumeName} v{resume.version}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Status
              <select
                className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
                defaultValue={editingApplication?.status ?? "SAVED"}
                name="status"
              >
                {applicationStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium">
                Applied Date
                <input
                  className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
                  defaultValue={dateInputValue(editingApplication?.appliedDate)}
                  name="appliedDate"
                  type="date"
                />
              </label>
              <label className="block text-sm font-medium">
                Follow-Up Date
                <input
                  className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
                  defaultValue={dateInputValue(editingApplication?.followUpDate)}
                  name="followUpDate"
                  type="date"
                />
              </label>
            </div>
            <label className="block text-sm font-medium">
              Recruiter Name
              <input
                className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
                defaultValue={editingApplication?.recruiterName ?? ""}
                name="recruiterName"
              />
            </label>
            <label className="block text-sm font-medium">
              Recruiter Email
              <input
                className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
                defaultValue={editingApplication?.recruiterEmail ?? ""}
                name="recruiterEmail"
                type="email"
              />
            </label>
            <label className="block text-sm font-medium">
              Interview Date
              <input
                className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
                defaultValue={dateInputValue(editingApplication?.interviewDate)}
                name="interviewDate"
                type="date"
              />
            </label>
            <label className="block text-sm font-medium">
              Notes
              <textarea
                className="mt-1 min-h-28 w-full rounded-md border border-[#cfcabf] px-3 py-2 outline-none focus:border-[#264653]"
                defaultValue={editingApplication?.notes ?? ""}
                name="notes"
              />
            </label>
            {error ? <p className="text-sm text-[#b42318]">{error}</p> : null}
            {message ? <p className="text-sm text-[#2a6f58]">{message}</p> : null}
            <div className="flex flex-wrap gap-2">
              <button
                className="h-10 rounded-md bg-[#264653] px-4 text-sm font-medium text-white hover:bg-[#1f3944] disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Saving..." : editingApplication ? "Save changes" : "Add application"}
              </button>
              {editingApplication ? (
                <button
                  className="h-10 rounded-md border border-[#cfcabf] px-4 text-sm font-medium hover:bg-[#f7f7f4]"
                  onClick={resetForm}
                  type="button"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </form>

        <div className="overflow-hidden rounded-md border border-[#d9d6cc] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="bg-[#f7f7f4] text-[#65707a]">
                <tr>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Resume Used</th>
                  <th className="px-4 py-3 font-medium">Applied</th>
                  <th className="px-4 py-3 font-medium">Follow-Up</th>
                  <th className="px-4 py-3 font-medium">Recruiter</th>
                  <th className="px-4 py-3 font-medium">Interview</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr className="border-t border-[#eeeae0]" key={application.id}>
                    <td className="px-4 py-3 font-medium text-[#17212b]">{application.job.companyName}</td>
                    <td className="px-4 py-3">
                      <Link className="font-medium text-[#264653]" href={`/jobs/${application.jobId}`}>
                        {application.job.jobTitle}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{formatApplicationStatus(application.status)}</td>
                    <td className="px-4 py-3">
                      {application.resumeVersion ? (
                        <Link className="font-medium text-[#264653]" href={`/resumes/${application.resumeVersion.id}`}>
                          {application.resumeVersion.resumeName} v{application.resumeVersion.version}
                          <span className="block text-xs font-normal text-[#65707a]">
                            {formatValidationStatus(application.resumeVersion.validationStatus)}
                          </span>
                        </Link>
                      ) : (
                        "No resume"
                      )}
                    </td>
                    <td className="px-4 py-3">{application.appliedDate ? formatDate(application.appliedDate) : "Not applied"}</td>
                    <td className="px-4 py-3">{application.followUpDate ? formatDate(application.followUpDate) : "None"}</td>
                    <td className="px-4 py-3">
                      {application.recruiterName || application.recruiterEmail ? (
                        <>
                          <span className="block">{application.recruiterName || "Recruiter"}</span>
                          <span className="block text-xs text-[#65707a]">{application.recruiterEmail}</span>
                        </>
                      ) : (
                        "None"
                      )}
                    </td>
                    <td className="px-4 py-3">{application.interviewDate ? formatDate(application.interviewDate) : "None"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          className="h-9 rounded-md border border-[#cfcabf] px-3 font-medium hover:bg-[#f7f7f4]"
                          onClick={() => startEdit(application)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="h-9 rounded-md border border-[#b42318] px-3 font-medium text-[#b42318] hover:bg-[#fff5f5]"
                          onClick={() => handleDelete(application)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {applications.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-[#65707a]" colSpan={9}>
                      No applications tracked yet.
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
