"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/jobs";
import {
  formatDetectionType,
  formatSuggestedStatus,
  type GmailStatus,
  type JobEmailRecord,
} from "@/lib/gmail";

export default function GmailPage() {
  const router = useRouter();
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [jobEmails, setJobEmails] = useState<JobEmailRecord[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [workingDetectionId, setWorkingDetectionId] = useState<string | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("connected")) {
      setMessage("Gmail connected");
    }

    Promise.all([
      apiFetch<{ status: GmailStatus }>("/api/gmail/status"),
      apiFetch<{ jobEmails: JobEmailRecord[] }>("/api/gmail/detections"),
    ])
      .then(([statusPayload, detectionsPayload]) => {
        setStatus(statusPayload.status);
        setJobEmails(detectionsPayload.jobEmails);
      })
      .catch(() => router.push("/login"))
      .finally(() => setIsLoading(false));
  }, [router]);

  function connectGmail() {
    window.location.href = `${API_URL}/api/gmail/connect`;
  }

  async function scanGmail() {
    setError("");
    setMessage("");
    setIsScanning(true);

    try {
      const response = await apiFetch<{ jobEmails: JobEmailRecord[] }>("/api/gmail/scan", {
        method: "POST",
        json: { maxResults: 20 },
      });
      const statusResponse = await apiFetch<{ status: GmailStatus }>("/api/gmail/status");
      setJobEmails(response.jobEmails);
      setStatus(statusResponse.status);
      setMessage(`${response.jobEmails.length} job-related emails found`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to scan Gmail");
    } finally {
      setIsScanning(false);
    }
  }

  async function decideDetection(detectionId: string, action: "confirm" | "ignore") {
    setError("");
    setMessage("");
    setWorkingDetectionId(detectionId);

    try {
      const response = await apiFetch<{ jobEmails: JobEmailRecord[] }>(`/api/gmail/detections/${detectionId}/${action}`, {
        method: "POST",
      });
      setJobEmails(response.jobEmails);
      setMessage(action === "confirm" ? "Detection confirmed" : "Detection ignored");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update detection");
    } finally {
      setWorkingDetectionId(null);
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
            <h1 className="mt-2 text-2xl font-semibold text-[#17212b]">Gmail Job Emails</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="h-10 rounded-md border border-[#cfcabf] px-4 text-sm font-medium hover:bg-[#f7f7f4]"
              onClick={connectGmail}
              type="button"
            >
              {status?.connected ? "Reconnect Gmail" : "Connect Gmail"}
            </button>
            <button
              className="h-10 rounded-md bg-[#264653] px-4 text-sm font-medium text-white hover:bg-[#1f3944] disabled:opacity-60"
              disabled={!status?.connected || isScanning}
              onClick={scanGmail}
              type="button"
            >
              {isScanning ? "Scanning..." : "Scan Gmail"}
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-6">
        <div className="rounded-md border border-[#d9d6cc] bg-white p-5">
          <h2 className="text-lg font-semibold text-[#17212b]">Connection</h2>
          <p className="mt-2 text-sm text-[#65707a]">
            {status?.connected ? `Connected as ${status.gmailEmail ?? "Gmail user"}` : "Gmail is not connected."}
          </p>
          {status?.lastScanAt ? <p className="mt-1 text-sm text-[#65707a]">Last scan: {formatDate(status.lastScanAt)}</p> : null}
          {error ? <p className="mt-3 text-sm text-[#b42318]">{error}</p> : null}
          {message ? <p className="mt-3 text-sm text-[#2a6f58]">{message}</p> : null}
        </div>

        <div className="mt-5 space-y-3">
          {jobEmails.map((email) => {
            const detection = email.detections[0];

            return (
              <article className="rounded-md border border-[#d9d6cc] bg-white p-5" key={email.id}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#17212b]">{email.subject}</p>
                    <p className="mt-1 text-sm text-[#65707a]">{email.fromEmail ?? "Unknown sender"}</p>
                    <p className="mt-3 text-sm leading-6 text-[#38434f]">{email.snippet}</p>
                    <p className="mt-3 text-sm text-[#65707a]">
                      {formatDetectionType(email.detectionType)} - {email.confidence}% confidence - {email.reason}
                    </p>
                    <p className="mt-1 text-sm text-[#65707a]">
                      Suggested action: {formatSuggestedStatus(email.suggestedStatus)}
                      {email.job ? ` for ${email.job.companyName} - ${email.job.jobTitle}` : " - no related job found"}
                    </p>
                  </div>
                  <div className="flex min-w-44 flex-wrap gap-2 lg:justify-end">
                    {email.job ? (
                      <Link className="h-9 rounded-md border border-[#cfcabf] px-3 py-2 text-sm font-medium hover:bg-[#f7f7f4]" href={`/jobs/${email.job.id}`}>
                        Open job
                      </Link>
                    ) : null}
                    <button
                      className="h-9 rounded-md bg-[#264653] px-3 text-sm font-medium text-white hover:bg-[#1f3944] disabled:opacity-60"
                      disabled={!detection || email.decisionStatus !== "PENDING" || workingDetectionId === detection.id}
                      onClick={() => detection && decideDetection(detection.id, "confirm")}
                      type="button"
                    >
                      Confirm
                    </button>
                    <button
                      className="h-9 rounded-md border border-[#cfcabf] px-3 text-sm font-medium hover:bg-[#f7f7f4] disabled:opacity-60"
                      disabled={!detection || email.decisionStatus !== "PENDING" || workingDetectionId === detection.id}
                      onClick={() => detection && decideDetection(detection.id, "ignore")}
                      type="button"
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          {jobEmails.length === 0 ? (
            <p className="rounded-md border border-[#d9d6cc] bg-white p-6 text-center text-sm text-[#65707a]">
              No job-related emails have been detected yet.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
