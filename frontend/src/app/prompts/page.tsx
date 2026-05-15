"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/jobs";
import type { PromptTemplate } from "@/lib/prompts";

export default function PromptsPage() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ prompts: PromptTemplate[] }>("/api/prompts")
      .then((payload) => setPrompts(payload.prompts))
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
            <h1 className="mt-2 text-2xl font-semibold text-[#17212b]">Prompt Library</h1>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#264653] px-4 text-sm font-medium text-white hover:bg-[#1f3944]"
            href="/prompts/new"
          >
            New prompt
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-6">
        <div className="grid gap-3">
          {prompts.map((prompt) => (
            <Link
              className="rounded-md border border-[#d9d6cc] bg-white p-5 hover:border-[#264653]"
              href={`/prompts/${prompt.id}`}
              key={prompt.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#17212b]">{prompt.name}</h2>
                  <p className="mt-1 text-sm text-[#65707a]">
                    {prompt.description || "No description"}
                  </p>
                </div>
                <span className="rounded-md bg-[#e6f0ec] px-2 py-1 text-xs font-medium text-[#2a6f58]">
                  v{prompt.version} {prompt.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-4 text-sm text-[#65707a]">
                Target role: {prompt.targetRole || "Any"} - Updated {formatDate(prompt.updatedAt)}
              </p>
            </Link>
          ))}
          {prompts.length === 0 ? (
            <div className="rounded-md border border-[#d9d6cc] bg-white p-10 text-center text-sm text-[#65707a]">
              No prompt templates saved yet.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
