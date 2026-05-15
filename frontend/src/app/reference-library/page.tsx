"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch, apiFormFetch } from "@/lib/api";
import { formatDate } from "@/lib/jobs";
import {
  formatParsedStatus,
  formatReferenceCategory,
  referenceCategoryOptions,
  type ReferenceCategory,
  type ReferenceEntryRecord,
  type ReferenceFileRecord,
} from "@/lib/reference-library";

export default function ReferenceLibraryPage() {
  const router = useRouter();
  const [referenceFiles, setReferenceFiles] = useState<ReferenceFileRecord[]>([]);
  const [referenceEntries, setReferenceEntries] = useState<ReferenceEntryRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [parsingFileId, setParsingFileId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<{ referenceFiles: ReferenceFileRecord[] }>("/api/reference-files"),
      apiFetch<{ referenceEntries: ReferenceEntryRecord[] }>("/api/reference-entries?limit=25"),
    ])
      .then(([filePayload, entryPayload]) => {
        setReferenceFiles(filePayload.referenceFiles);
        setReferenceEntries(entryPayload.referenceEntries);
      })
      .catch(() => router.push("/login"))
      .finally(() => setIsLoading(false));
  }, [router]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsUploading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await apiFormFetch<{ referenceFile: ReferenceFileRecord }>("/api/reference-files/upload", formData);
      setReferenceFiles((currentFiles) => [response.referenceFile, ...currentFiles]);
      form.reset();
      setMessage("Reference file uploaded");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to upload reference file");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleParse(referenceFile: ReferenceFileRecord) {
    setError("");
    setMessage("");
    setParsingFileId(referenceFile.id);

    try {
      const response = await apiFetch<{ referenceFile: ReferenceFileRecord; entriesCreated: number }>(
        `/api/reference-files/${referenceFile.id}/parse`,
        { method: "POST" }
      );
      setReferenceFiles((currentFiles) =>
        currentFiles.map((currentFile) =>
          currentFile.id === response.referenceFile.id ? response.referenceFile : currentFile
        )
      );
      const entriesResponse = await apiFetch<{ referenceEntries: ReferenceEntryRecord[] }>("/api/reference-entries?limit=25");
      setReferenceEntries(entriesResponse.referenceEntries);
      setMessage(`${response.entriesCreated} entries parsed`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to parse reference file");
    } finally {
      setParsingFileId(null);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSearching(true);

    const path = searchQuery.trim()
      ? `/api/reference-entries/search?q=${encodeURIComponent(searchQuery)}${searchCategory ? `&category=${searchCategory}` : ""}`
      : `/api/reference-entries?limit=50${searchCategory ? `&category=${searchCategory}` : ""}`;

    try {
      const response = await apiFetch<{ referenceEntries: ReferenceEntryRecord[] }>(path);
      setReferenceEntries(response.referenceEntries);
      setMessage(`${response.referenceEntries.length} entries found`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to search reference entries");
    } finally {
      setIsSearching(false);
    }
  }

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
            <h1 className="mt-2 text-2xl font-semibold text-[#17212b]">Reference Library</h1>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-[#cfcabf] px-4 text-sm font-medium hover:bg-[#f7f7f4]"
            href="/prompts"
          >
            Prompt Library
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5">
          <form className="rounded-md border border-[#d9d6cc] bg-white p-5" onSubmit={handleUpload}>
            <h2 className="text-lg font-semibold text-[#17212b]">Upload Excel Reference</h2>
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-medium">
                Category
                <select
                  className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
                  name="category"
                  required
                >
                  {referenceCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Excel File
                <input
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="mt-1 h-10 w-full rounded-md border border-[#cfcabf] bg-white px-3 py-2 text-sm outline-none file:mr-3 file:rounded-md file:border-0 file:bg-[#e8efed] file:px-3 file:py-1 file:text-sm file:font-medium file:text-[#264653]"
                  name="referenceFile"
                  required
                  type="file"
                />
              </label>
              {error ? <p className="text-sm text-[#b42318]">{error}</p> : null}
              {message ? <p className="text-sm text-[#2a6f58]">{message}</p> : null}
              <button
                className="h-10 rounded-md bg-[#264653] px-4 text-sm font-medium text-white hover:bg-[#1f3944] disabled:opacity-60"
                disabled={isUploading}
                type="submit"
              >
                {isUploading ? "Uploading..." : "Upload file"}
              </button>
            </div>
          </form>

          <section className="rounded-md border border-[#d9d6cc] bg-white p-5">
            <h2 className="text-lg font-semibold text-[#17212b]">Reference Files</h2>
            <div className="mt-4 space-y-3">
              {referenceFiles.map((referenceFile) => (
                <div className="rounded-md border border-[#d9d6cc] bg-[#fdfdfb] p-3" key={referenceFile.id}>
                  <p className="text-sm font-medium text-[#17212b]">{referenceFile.name}</p>
                  <p className="mt-1 text-sm text-[#65707a]">
                    {formatReferenceCategory(referenceFile.category)} - {formatParsedStatus(referenceFile.parsedStatus)} - {referenceFile._count.entries} entries
                  </p>
                  <p className="mt-1 text-xs text-[#65707a]">Uploaded {formatDate(referenceFile.uploadedAt)}</p>
                  <button
                    className="mt-3 h-9 rounded-md border border-[#cfcabf] px-3 text-sm font-medium hover:bg-white disabled:opacity-60"
                    disabled={parsingFileId === referenceFile.id}
                    onClick={() => handleParse(referenceFile)}
                    type="button"
                  >
                    {parsingFileId === referenceFile.id ? "Parsing..." : "Parse rows"}
                  </button>
                </div>
              ))}
              {referenceFiles.length === 0 ? (
                <p className="text-sm text-[#65707a]">No reference files uploaded yet.</p>
              ) : null}
            </div>
          </section>
        </div>

        <section className="rounded-md border border-[#d9d6cc] bg-white p-5">
          <h2 className="text-lg font-semibold text-[#17212b]">Search Reference Entries</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_auto]" onSubmit={handleSearch}>
            <input
              className="h-10 rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search verbs, keywords, examples, or rewrite guidance"
              value={searchQuery}
            />
            <select
              className="h-10 rounded-md border border-[#cfcabf] px-3 outline-none focus:border-[#264653]"
              onChange={(event) => setSearchCategory(event.target.value as ReferenceCategory | "")}
              value={searchCategory}
            >
              <option value="">All categories</option>
              {referenceCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              className="h-10 rounded-md bg-[#264653] px-4 text-sm font-medium text-white hover:bg-[#1f3944] disabled:opacity-60"
              disabled={isSearching}
              type="submit"
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </form>

          <div className="mt-5 space-y-3">
            {referenceEntries.map((entry) => (
              <article className="rounded-md border border-[#d9d6cc] bg-[#fdfdfb] p-4" key={entry.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#17212b]">
                      {entry.title || formatReferenceCategory(entry.category)}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#38434f]">{entry.content}</p>
                  </div>
                  <span className="rounded-md bg-[#e6f0ec] px-2 py-1 text-xs font-medium text-[#2a6f58]">
                    {formatReferenceCategory(entry.category)}
                  </span>
                </div>
                {entry.tagsJson?.length ? (
                  <p className="mt-3 text-xs text-[#65707a]">Tags: {entry.tagsJson.join(", ")}</p>
                ) : null}
                <p className="mt-2 text-xs text-[#65707a]">Source: {entry.referenceFile.name}</p>
              </article>
            ))}
            {referenceEntries.length === 0 ? (
              <p className="rounded-md border border-[#d9d6cc] bg-[#fdfdfb] p-6 text-center text-sm text-[#65707a]">
                No reference entries found.
              </p>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
