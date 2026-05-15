"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        json: {
          email: formData.get("email"),
          password: formData.get("password"),
        },
      });
      router.push("/dashboard");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] px-5 py-10 text-[#1f2933]">
      <section className="mx-auto max-w-md rounded-md border border-[#d9d6cc] bg-white p-6">
        <p className="text-sm font-medium text-[#6f7d4f]">ResumeFlow OS</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#17212b]">Log in</h1>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium">
            Email
            <input
              className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
              name="email"
              type="email"
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
              name="password"
              type="password"
              required
            />
          </label>
          {error ? <p className="text-sm text-[#b42318]">{error}</p> : null}
          <button
            className="h-10 w-full rounded-md bg-[#264653] px-4 text-sm font-medium text-white hover:bg-[#1f3944] disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Logging in..." : "Log in"}
          </button>
        </form>
        <p className="mt-4 text-sm text-[#65707a]">
          New to ResumeFlow?{" "}
          <Link className="font-medium text-[#264653]" href="/register">
            Create account
          </Link>
        </p>
      </section>
    </main>
  );
}
