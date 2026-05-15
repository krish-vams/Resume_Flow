"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { API_URL, apiFetch, apiFormFetch } from "@/lib/api";
import {
  focusTypeOptions,
  formatFocusType,
  jsonListToLines,
  linesToJsonList,
  type ResumeFocusTemplate,
} from "@/lib/focus-templates";

function getRouteId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveFileUrl(value: string) {
  return value.startsWith("http") ? value : `${API_URL}${value}`;
}

export default function FocusTemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const focusTemplateId = getRouteId(params.id);
  const [focusTemplate, setFocusTemplate] = useState<ResumeFocusTemplate | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!focusTemplateId) {
      return;
    }

    apiFetch<{ focusTemplate: ResumeFocusTemplate }>(`/api/focus-templates/${focusTemplateId}`)
      .then((payload) => setFocusTemplate(payload.focusTemplate))
      .catch(() => router.push("/focus-templates"))
      .finally(() => setIsLoading(false));
  }, [focusTemplateId, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!focusTemplate) {
      return;
    }

    setError("");
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    formData.set("targetRolesJson", JSON.stringify(linesToJsonList(formData.get("targetRoles"))));
    formData.set("defaultSkillsJson", JSON.stringify(linesToJsonList(formData.get("defaultSkills"))));
    formData.delete("targetRoles");
    formData.delete("defaultSkills");

    try {
      const response = await apiFormFetch<{ focusTemplate: ResumeFocusTemplate }>(
        `/api/focus-templates/${focusTemplate.id}`,
        formData,
        { method: "PUT" }
      );
      setFocusTemplate(response.focusTemplate);
      setMessage("Focus template saved");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save focus template");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!focusTemplate) {
      return;
    }

    await apiFetch(`/api/focus-templates/${focusTemplate.id}`, { method: "DELETE" });
    router.push("/focus-templates");
  }

  if (isLoading) {
    return <main className="min-h-screen bg-[#f7f7f4] p-6 text-[#1f2933]">Loading...</main>;
  }

  if (!focusTemplate) {
    return <main className="min-h-screen bg-[#f7f7f4] p-6 text-[#1f2933]">Focus template not found.</main>;
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#1f2933]">
      <section className="border-b border-[#d9d6cc] bg-white">
        <div className="mx-auto max-w-5xl px-5 py-5">
          <Link className="text-sm font-medium text-[#264653]" href="/focus-templates">
            Back to focus templates
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-[#17212b]">{focusTemplate.name}</h1>
          <p className="mt-1 text-sm text-[#65707a]">{formatFocusType(focusTemplate.focusType)}</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-6">
        <form className="grid gap-4 rounded-md border border-[#d9d6cc] bg-white p-5 md:grid-cols-2" onSubmit={handleSubmit}>
          <input name="baseResumeFileUrl" type="hidden" value={focusTemplate.baseResumeFileUrl ?? ""} />
          <label className="block text-sm font-medium">
            Template Name
            <input className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]" defaultValue={focusTemplate.name} name="name" required />
          </label>
          <label className="block text-sm font-medium">
            Focus Type
            <select className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]" defaultValue={focusTemplate.focusType} name="focusType" required>
              {focusTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Primary Language
            <input className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]" defaultValue={focusTemplate.primaryLanguage ?? ""} name="primaryLanguage" />
          </label>
          <label className="block text-sm font-medium">
            Replace Base Resume File
            <input className="mt-1 block w-full text-sm" name="baseResumeFile" type="file" />
          </label>
          {focusTemplate.baseResumeFileUrl ? (
            <div className="rounded-md border border-[#d9d6cc] bg-[#fdfdfb] p-3 text-sm md:col-span-2">
              Current file:{" "}
              <a className="font-medium text-[#264653]" href={resolveFileUrl(focusTemplate.baseResumeFileUrl)} rel="noreferrer" target="_blank">
                Open uploaded resume
              </a>
            </div>
          ) : null}
          <label className="block text-sm font-medium md:col-span-2">
            Description
            <input className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]" defaultValue={focusTemplate.description ?? ""} name="description" />
          </label>
          <label className="block text-sm font-medium md:col-span-2">
            Target Roles
            <textarea className="mt-1 min-h-24 w-full rounded-md border border-[#cfcabf] px-3 py-2 outline-none focus:border-[#264653]" defaultValue={jsonListToLines(focusTemplate.targetRolesJson)} name="targetRoles" />
          </label>
          <label className="block text-sm font-medium md:col-span-2">
            Default Skills
            <textarea className="mt-1 min-h-32 w-full rounded-md border border-[#cfcabf] px-3 py-2 outline-none focus:border-[#264653]" defaultValue={jsonListToLines(focusTemplate.defaultSkillsJson)} name="defaultSkills" />
          </label>
          <label className="block text-sm font-medium md:col-span-2">
            Base Resume Text
            <textarea className="mt-1 min-h-80 w-full rounded-md border border-[#cfcabf] px-3 py-2 font-mono text-sm outline-none focus:border-[#264653]" defaultValue={focusTemplate.baseResumeText ?? ""} name="baseResumeText" />
          </label>
          <div className="flex flex-wrap gap-3 md:col-span-2">
            {error ? <p className="basis-full text-sm text-[#b42318]">{error}</p> : null}
            {message ? <p className="basis-full text-sm text-[#2a6f58]">{message}</p> : null}
            <button className="h-10 rounded-md bg-[#264653] px-4 text-sm font-medium text-white hover:bg-[#1f3944] disabled:opacity-60" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : "Save focus template"}
            </button>
            <button className="h-10 rounded-md border border-[#b42318] px-4 text-sm font-medium text-[#b42318] hover:bg-[#fff5f5]" onClick={handleDelete} type="button">
              Delete
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
