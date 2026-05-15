"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function NewPromptPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await apiFetch<{ prompt: { id: string } }>("/api/prompts", {
        method: "POST",
        json: {
          name: formData.get("name"),
          description: formData.get("description"),
          promptText: formData.get("promptText"),
          targetRole: formData.get("targetRole"),
          candidateName: formData.get("candidateName"),
          isActive: formData.get("isActive") === "on",
        },
      });
      router.push(`/prompts/${response.prompt.id}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save prompt");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#1f2933]">
      <section className="border-b border-[#d9d6cc] bg-white">
        <div className="mx-auto max-w-5xl px-5 py-5">
          <Link className="text-sm font-medium text-[#264653]" href="/prompts">
            Back to prompts
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-[#17212b]">New prompt template</h1>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-6">
        <form className="grid gap-4 rounded-md border border-[#d9d6cc] bg-white p-5 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium">
            Prompt Name
            <input className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]" name="name" required />
          </label>
          <label className="block text-sm font-medium">
            Target Role
            <input className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]" name="targetRole" />
          </label>
          <label className="block text-sm font-medium">
            Candidate Name
            <input className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]" name="candidateName" />
          </label>
          <label className="flex items-center gap-2 pt-7 text-sm font-medium">
            <input className="h-4 w-4" defaultChecked name="isActive" type="checkbox" />
            Active
          </label>
          <label className="block text-sm font-medium md:col-span-2">
            Description
            <input className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]" name="description" />
          </label>
          <label className="block text-sm font-medium md:col-span-2">
            Prompt Text
            <textarea className="mt-1 min-h-96 w-full rounded-md border border-[#cfcabf] px-3 py-2 font-mono text-sm outline-none focus:border-[#264653]" name="promptText" required />
          </label>
          <div className="md:col-span-2">
            {error ? <p className="mb-3 text-sm text-[#b42318]">{error}</p> : null}
            <button
              className="h-10 rounded-md bg-[#264653] px-4 text-sm font-medium text-white hover:bg-[#1f3944] disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Saving..." : "Save prompt"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
