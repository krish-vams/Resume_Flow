"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiFormFetch } from "@/lib/api";
import { focusTypeOptions, linesToJsonList, type ResumeFocusTemplate } from "@/lib/focus-templates";

export default function NewFocusTemplatePage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    formData.set("targetRolesJson", JSON.stringify(linesToJsonList(formData.get("targetRoles"))));
    formData.set("defaultSkillsJson", JSON.stringify(linesToJsonList(formData.get("defaultSkills"))));
    formData.delete("targetRoles");
    formData.delete("defaultSkills");

    try {
      const response = await apiFormFetch<{ focusTemplate: ResumeFocusTemplate }>(
        "/api/focus-templates",
        formData
      );
      router.push(`/focus-templates/${response.focusTemplate.id}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save focus template");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#1f2933]">
      <section className="border-b border-[#d9d6cc] bg-white">
        <div className="mx-auto max-w-5xl px-5 py-5">
          <Link className="text-sm font-medium text-[#264653]" href="/focus-templates">
            Back to focus templates
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-[#17212b]">New focus template</h1>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-6">
        <form className="grid gap-4 rounded-md border border-[#d9d6cc] bg-white p-5 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium">
            Template Name
            <input className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]" name="name" required />
          </label>
          <label className="block text-sm font-medium">
            Focus Type
            <select className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]" name="focusType" required>
              {focusTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Primary Language
            <input className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]" name="primaryLanguage" />
          </label>
          <label className="block text-sm font-medium">
            Base Resume File
            <input className="mt-1 block w-full text-sm" name="baseResumeFile" type="file" />
          </label>
          <label className="block text-sm font-medium md:col-span-2">
            Description
            <input className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]" name="description" />
          </label>
          <label className="block text-sm font-medium md:col-span-2">
            Target Roles
            <textarea className="mt-1 min-h-24 w-full rounded-md border border-[#cfcabf] px-3 py-2 outline-none focus:border-[#264653]" name="targetRoles" />
          </label>
          <label className="block text-sm font-medium md:col-span-2">
            Default Skills
            <textarea className="mt-1 min-h-32 w-full rounded-md border border-[#cfcabf] px-3 py-2 outline-none focus:border-[#264653]" name="defaultSkills" />
          </label>
          <label className="block text-sm font-medium md:col-span-2">
            Base Resume Text
            <textarea className="mt-1 min-h-80 w-full rounded-md border border-[#cfcabf] px-3 py-2 font-mono text-sm outline-none focus:border-[#264653]" name="baseResumeText" />
          </label>
          <div className="md:col-span-2">
            {error ? <p className="mb-3 text-sm text-[#b42318]">{error}</p> : null}
            <button className="h-10 rounded-md bg-[#264653] px-4 text-sm font-medium text-white hover:bg-[#1f3944] disabled:opacity-60" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : "Save focus template"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
