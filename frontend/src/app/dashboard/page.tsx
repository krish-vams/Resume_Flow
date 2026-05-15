"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type User = {
  id: string;
  name: string;
  email: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ user: User }>("/api/auth/me")
      .then((payload) => setUser(payload.user))
      .catch(() => router.push("/login"))
      .finally(() => setIsLoading(false));
  }, [router]);

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (isLoading) {
    return <main className="min-h-screen bg-[#f7f7f4] p-6 text-[#1f2933]">Loading...</main>;
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#1f2933]">
      <section className="border-b border-[#d9d6cc] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-[#65707a]">Signed in as {user?.email}</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#17212b]">Dashboard</h1>
          </div>
          <button
            className="h-10 rounded-md border border-[#cfcabf] px-4 text-sm font-medium hover:bg-[#f7f7f4]"
            onClick={handleLogout}
            type="button"
          >
            Log out
          </button>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-6 md:grid-cols-2">
        <Link
          className="rounded-md border border-[#d9d6cc] bg-white p-5 hover:border-[#264653]"
          href="/jobs"
        >
          <h2 className="text-lg font-semibold text-[#17212b]">Jobs</h2>
          <p className="mt-2 text-sm leading-6 text-[#65707a]">
            Save job descriptions, track status, and keep each generated resume connected to its source JD.
          </p>
        </Link>
        <Link
          className="rounded-md border border-[#d9d6cc] bg-white p-5 hover:border-[#264653]"
          href="/settings/profile"
        >
          <h2 className="text-lg font-semibold text-[#17212b]">Candidate profile</h2>
          <p className="mt-2 text-sm leading-6 text-[#65707a]">
            Store contact details, education, certifications, and the default resume output name.
          </p>
        </Link>
        <Link
          className="rounded-md border border-[#d9d6cc] bg-white p-5 hover:border-[#264653]"
          href="/prompts"
        >
          <h2 className="text-lg font-semibold text-[#17212b]">Prompt Library</h2>
          <p className="mt-2 text-sm leading-6 text-[#65707a]">
            Save Gemini prompt templates, version edits, duplicate variants, and assemble final prompts.
          </p>
        </Link>
        <Link
          className="rounded-md border border-[#d9d6cc] bg-white p-5 hover:border-[#264653]"
          href="/focus-templates"
        >
          <h2 className="text-lg font-semibold text-[#17212b]">Focus Templates</h2>
          <p className="mt-2 text-sm leading-6 text-[#65707a]">
            Manage stack-specific resume strategies for Java, .NET, Node.js, Go, AI, cloud, and full-stack roles.
          </p>
        </Link>
        <div className="rounded-md border border-[#d9d6cc] bg-white p-5">
          <h2 className="text-lg font-semibold text-[#17212b]">Phase 1 status</h2>
          <p className="mt-2 text-sm leading-6 text-[#65707a]">
            Authentication and candidate profile APIs are ready for the formatter integration path.
          </p>
        </div>
      </section>
    </main>
  );
}
