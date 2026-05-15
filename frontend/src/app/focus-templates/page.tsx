"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/jobs";
import {
  formatFocusType,
  type ResumeFocusTemplate,
} from "@/lib/focus-templates";

export default function FocusTemplatesPage() {
  const router = useRouter();
  const [focusTemplates, setFocusTemplates] = useState<ResumeFocusTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ focusTemplates: ResumeFocusTemplate[] }>("/api/focus-templates")
      .then((payload) => setFocusTemplates(payload.focusTemplates))
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
            <h1 className="mt-2 text-2xl font-semibold text-[#17212b]">Resume Focus Templates</h1>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#264653] px-4 text-sm font-medium text-white hover:bg-[#1f3944]"
            href="/focus-templates/new"
          >
            New focus template
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-6">
        <div className="grid gap-3 md:grid-cols-2">
          {focusTemplates.map((template) => (
            <Link
              className="rounded-md border border-[#d9d6cc] bg-white p-5 hover:border-[#264653]"
              href={`/focus-templates/${template.id}`}
              key={template.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#17212b]">{template.name}</h2>
                  <p className="mt-1 text-sm text-[#65707a]">{formatFocusType(template.focusType)}</p>
                </div>
                <span className="rounded-md bg-[#e6f0ec] px-2 py-1 text-xs font-medium text-[#2a6f58]">
                  {template.primaryLanguage || "Any"}
                </span>
              </div>
              <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#65707a]">
                {template.description || "No description"}
              </p>
              <p className="mt-4 text-sm text-[#65707a]">Updated {formatDate(template.updatedAt)}</p>
            </Link>
          ))}
          {focusTemplates.length === 0 ? (
            <div className="rounded-md border border-[#d9d6cc] bg-white p-10 text-center text-sm text-[#65707a] md:col-span-2">
              No focus templates saved yet.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
