"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { JobRecord } from "@/lib/jobs";
import type { AssembledPrompt, PromptTemplate } from "@/lib/prompts";

function getRouteId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function PromptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const promptId = getRouteId(params.id);
  const [prompt, setPrompt] = useState<PromptTemplate | null>(null);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [assembledPrompt, setAssembledPrompt] = useState<AssembledPrompt | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!promptId) {
      return;
    }

    Promise.all([
      apiFetch<{ prompt: PromptTemplate }>(`/api/prompts/${promptId}`),
      apiFetch<{ jobs: JobRecord[] }>("/api/jobs"),
    ])
      .then(([promptPayload, jobsPayload]) => {
        setPrompt(promptPayload.prompt);
        setJobs(jobsPayload.jobs);
        setSelectedJobId(jobsPayload.jobs[0]?.id ?? "");
      })
      .catch(() => router.push("/prompts"))
      .finally(() => setIsLoading(false));
  }, [promptId, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!prompt) {
      return;
    }

    setError("");
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await apiFetch<{ prompt: PromptTemplate }>(`/api/prompts/${prompt.id}`, {
        method: "PUT",
        json: {
          name: formData.get("name"),
          description: formData.get("description"),
          promptText: formData.get("promptText"),
          targetRole: formData.get("targetRole"),
          candidateName: formData.get("candidateName"),
          isActive: formData.get("isActive") === "on",
        },
      });
      setPrompt(response.prompt);
      setMessage("Prompt saved");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save prompt");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDuplicate() {
    if (!prompt) {
      return;
    }

    const response = await apiFetch<{ prompt: PromptTemplate }>(`/api/prompts/${prompt.id}/duplicate`, {
      method: "POST",
    });
    router.push(`/prompts/${response.prompt.id}`);
  }

  async function handleAssemble() {
    if (!prompt || !selectedJobId) {
      setError("Select a job before assembling the final prompt");
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await apiFetch<{ assembledPrompt: AssembledPrompt }>(
        `/api/prompts/${prompt.id}/assemble`,
        {
          method: "POST",
          json: { jobId: selectedJobId },
        }
      );
      setAssembledPrompt(response.assembledPrompt);
      setMessage("Final prompt assembled");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to assemble prompt");
    }
  }

  async function handleCopy() {
    if (!assembledPrompt) {
      return;
    }

    await navigator.clipboard.writeText(assembledPrompt.finalPrompt);
    setMessage("Final prompt copied");
  }

  async function handleDelete() {
    if (!prompt) {
      return;
    }

    await apiFetch(`/api/prompts/${prompt.id}`, { method: "DELETE" });
    router.push("/prompts");
  }

  if (isLoading) {
    return <main className="min-h-screen bg-[#f7f7f4] p-6 text-[#1f2933]">Loading...</main>;
  }

  if (!prompt) {
    return <main className="min-h-screen bg-[#f7f7f4] p-6 text-[#1f2933]">Prompt not found.</main>;
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#1f2933]">
      <section className="border-b border-[#d9d6cc] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link className="text-sm font-medium text-[#264653]" href="/prompts">
              Back to prompts
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-[#17212b]">{prompt.name}</h1>
            <p className="mt-1 text-sm text-[#65707a]">
              Version {prompt.version} - {prompt.isActive ? "Active" : "Inactive"}
            </p>
          </div>
          <button
            className="h-10 rounded-md border border-[#cfcabf] px-4 text-sm font-medium hover:bg-[#f7f7f4]"
            onClick={handleDuplicate}
            type="button"
          >
            Duplicate
          </button>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[1fr_420px]">
        <form className="grid gap-4 rounded-md border border-[#d9d6cc] bg-white p-5 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium">
            Prompt Name
            <input className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]" defaultValue={prompt.name} name="name" required />
          </label>
          <label className="block text-sm font-medium">
            Target Role
            <input className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]" defaultValue={prompt.targetRole ?? ""} name="targetRole" />
          </label>
          <label className="block text-sm font-medium">
            Candidate Name
            <input className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]" defaultValue={prompt.candidateName ?? ""} name="candidateName" />
          </label>
          <label className="flex items-center gap-2 pt-7 text-sm font-medium">
            <input className="h-4 w-4" defaultChecked={prompt.isActive} name="isActive" type="checkbox" />
            Active
          </label>
          <label className="block text-sm font-medium md:col-span-2">
            Description
            <input className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]" defaultValue={prompt.description ?? ""} name="description" />
          </label>
          <label className="block text-sm font-medium md:col-span-2">
            Prompt Text
            <textarea className="mt-1 min-h-[520px] w-full rounded-md border border-[#cfcabf] px-3 py-2 font-mono text-sm outline-none focus:border-[#264653]" defaultValue={prompt.promptText} name="promptText" required />
          </label>
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <button
              className="h-10 rounded-md bg-[#264653] px-4 text-sm font-medium text-white hover:bg-[#1f3944] disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Saving..." : "Save prompt"}
            </button>
            <button
              className="h-10 rounded-md border border-[#b42318] px-4 text-sm font-medium text-[#b42318] hover:bg-[#fff5f5]"
              onClick={handleDelete}
              type="button"
            >
              Delete
            </button>
          </div>
        </form>

        <aside className="space-y-5">
          <section className="rounded-md border border-[#d9d6cc] bg-white p-5">
            <h2 className="text-lg font-semibold text-[#17212b]">Assemble final prompt</h2>
            <label className="mt-4 block text-sm font-medium">
              Target Job
              <select
                className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
                onChange={(event) => setSelectedJobId(event.target.value)}
                value={selectedJobId}
              >
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.companyName} - {job.jobTitle}
                  </option>
                ))}
              </select>
            </label>
            {jobs.length === 0 ? (
              <p className="mt-3 text-sm text-[#b42318]">Save a job before assembling a final prompt.</p>
            ) : null}
            <button
              className="mt-4 h-10 w-full rounded-md bg-[#264653] px-4 text-sm font-medium text-white hover:bg-[#1f3944] disabled:opacity-60"
              disabled={jobs.length === 0}
              onClick={handleAssemble}
              type="button"
            >
              Assemble prompt
            </button>
          </section>

          <section className="rounded-md border border-[#d9d6cc] bg-white p-5">
            <h2 className="text-lg font-semibold text-[#17212b]">Final prompt</h2>
            {error ? <p className="mt-3 text-sm text-[#b42318]">{error}</p> : null}
            {message ? <p className="mt-3 text-sm text-[#2a6f58]">{message}</p> : null}
            <textarea
              className="mt-4 min-h-[420px] w-full rounded-md border border-[#cfcabf] px-3 py-2 font-mono text-xs outline-none"
              readOnly
              value={assembledPrompt?.finalPrompt ?? ""}
            />
            <button
              className="mt-3 h-10 w-full rounded-md border border-[#cfcabf] px-4 text-sm font-medium hover:bg-[#f7f7f4] disabled:opacity-60"
              disabled={!assembledPrompt}
              onClick={handleCopy}
              type="button"
            >
              Copy final prompt
            </button>
          </section>
        </aside>
      </section>
    </main>
  );
}
