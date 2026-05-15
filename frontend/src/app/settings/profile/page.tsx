"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type CandidateProfile = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  educationJson?: Array<Record<string, unknown>> | null;
  certificationsJson?: Array<Record<string, unknown>> | null;
  defaultResumeName?: string | null;
};

function linesToJson(value: FormDataEntryValue | null, key: string) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ [key]: line }));
}

function jsonToLines(value: CandidateProfile["educationJson"], key: string) {
  return (value ?? [])
    .map((entry) => entry[key])
    .filter((entry): entry is string => typeof entry === "string")
    .join("\n");
}

export default function CandidateProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<{ profiles: CandidateProfile[] }>("/api/candidate-profiles")
      .then((payload) => setProfile(payload.profiles[0] ?? null))
      .catch(() => router.push("/login"))
      .finally(() => setIsLoading(false));
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      location: formData.get("location"),
      linkedinUrl: formData.get("linkedinUrl"),
      githubUrl: formData.get("githubUrl"),
      defaultResumeName: formData.get("defaultResumeName"),
      educationJson: linesToJson(formData.get("education"), "education"),
      certificationsJson: linesToJson(formData.get("certifications"), "certification"),
    };

    try {
      const response = profile
        ? await apiFetch<{ profile: CandidateProfile }>(`/api/candidate-profiles/${profile.id}`, {
            method: "PUT",
            json: payload,
          })
        : await apiFetch<{ profile: CandidateProfile }>("/api/candidate-profiles", {
            method: "POST",
            json: payload,
          });

      setProfile(response.profile);
      setMessage("Profile saved");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save profile");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <main className="min-h-screen bg-[#f7f7f4] p-6 text-[#1f2933]">Loading...</main>;
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#1f2933]">
      <section className="border-b border-[#d9d6cc] bg-white">
        <div className="mx-auto max-w-4xl px-5 py-5">
          <Link className="text-sm font-medium text-[#264653]" href="/dashboard">
            Back to dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-[#17212b]">Candidate profile</h1>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-5 py-6">
        <form className="grid gap-4 rounded-md border border-[#d9d6cc] bg-white p-5 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium">
            Full name
            <input
              className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
              defaultValue={profile?.fullName ?? ""}
              name="fullName"
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Email
            <input
              className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
              defaultValue={profile?.email ?? ""}
              name="email"
              type="email"
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Phone
            <input
              className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
              defaultValue={profile?.phone ?? ""}
              name="phone"
            />
          </label>
          <label className="block text-sm font-medium">
            Location
            <input
              className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
              defaultValue={profile?.location ?? ""}
              name="location"
            />
          </label>
          <label className="block text-sm font-medium">
            LinkedIn URL
            <input
              className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
              defaultValue={profile?.linkedinUrl ?? ""}
              name="linkedinUrl"
              type="url"
            />
          </label>
          <label className="block text-sm font-medium">
            GitHub URL
            <input
              className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
              defaultValue={profile?.githubUrl ?? ""}
              name="githubUrl"
              type="url"
            />
          </label>
          <label className="block text-sm font-medium md:col-span-2">
            Default output resume name
            <input
              className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
              defaultValue={profile?.defaultResumeName ?? ""}
              name="defaultResumeName"
              placeholder="Firstname_Lastname_Company_Role"
            />
          </label>
          <label className="block text-sm font-medium md:col-span-2">
            Education
            <textarea
              className="mt-1 min-h-28 w-full rounded-md border border-[#cfcabf] px-3 py-2 outline-none focus:border-[#264653]"
              defaultValue={jsonToLines(profile?.educationJson, "education")}
              name="education"
            />
          </label>
          <label className="block text-sm font-medium md:col-span-2">
            Certifications
            <textarea
              className="mt-1 min-h-24 w-full rounded-md border border-[#cfcabf] px-3 py-2 outline-none focus:border-[#264653]"
              defaultValue={jsonToLines(profile?.certificationsJson, "certification")}
              name="certifications"
            />
          </label>
          <div className="md:col-span-2">
            {error ? <p className="mb-3 text-sm text-[#b42318]">{error}</p> : null}
            {message ? <p className="mb-3 text-sm text-[#2a6f58]">{message}</p> : null}
            <button
              className="h-10 rounded-md bg-[#264653] px-4 text-sm font-medium text-white hover:bg-[#1f3944] disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Saving..." : "Save profile"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
