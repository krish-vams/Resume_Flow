"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function NewJobPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await apiFetch<{ job: { id: string } }>("/api/jobs", {
        method: "POST",
        json: {
          companyName: formData.get("companyName"),
          jobTitle: formData.get("jobTitle"),
          jobUrl: formData.get("jobUrl"),
          location: formData.get("location"),
          jobType: formData.get("jobType"),
          jobDescription: formData.get("jobDescription"),
          notes: formData.get("notes"),
          status: "RESUME_NEEDED",
        },
      });
      router.push(`/jobs/${response.job.id}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save job");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#1f2933]">
      <section className="border-b border-[#d9d6cc] bg-white">
        <div className="mx-auto max-w-4xl px-5 py-5">
          <Link className="text-sm font-medium text-[#264653]" href="/jobs">
            Back to jobs
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-[#17212b]">Add job</h1>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-6">
        <form className="grid gap-4 rounded-md border border-[#d9d6cc] bg-white p-5 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium">
            Company Name
            <input className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]" name="companyName" required />
          </label>
          <label className="block text-sm font-medium">
            Job Title
            <input className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]" name="jobTitle" required />
          </label>
          <label className="block text-sm font-medium">
            Job URL
            <input className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]" name="jobUrl" type="url" />
          </label>
          <label className="block text-sm font-medium">
            Location
            <input className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]" name="location" />
          </label>
          <label className="block text-sm font-medium">
            Job Type
            <input className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]" name="jobType" placeholder="Full-time, contract, remote" />
          </label>
          <label className="block text-sm font-medium">
            Notes
            <input className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]" name="notes" />
          </label>
          <label className="block text-sm font-medium md:col-span-2">
            Job Description
            <textarea className="mt-1 min-h-80 w-full rounded-md border border-[#cfcabf] px-3 py-2 outline-none focus:border-[#264653]" name="jobDescription" required />
          </label>
          <div className="md:col-span-2">
            {error ? <p className="mb-3 text-sm text-[#b42318]">{error}</p> : null}
            <button
              className="h-10 rounded-md bg-[#264653] px-4 text-sm font-medium text-white hover:bg-[#1f3944] disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Saving..." : "Save job"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
