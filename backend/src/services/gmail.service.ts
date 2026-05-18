import crypto from "crypto";
import type { Job, JobStatus } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../utils/prisma";
import { HttpError } from "../utils/http-error";

type GmailTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error_description?: string;
};

type GmailMessageListResponse = {
  messages?: Array<{ id: string; threadId?: string }>;
};

type GmailMessageResponse = {
  id: string;
  threadId?: string;
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
  };
};

type GmailProfileResponse = {
  emailAddress?: string;
};

const gmailReadonlyScope = "https://www.googleapis.com/auth/gmail.readonly";
const detectionQuery = [
  "newer_than:45d",
  "(",
  "interview OR recruiter OR assessment OR application OR applying OR applied OR unfortunately OR rejection OR offer",
  'OR "thank you for applying" OR "next step" OR "coding challenge"',
  ")"
].join(" ");

function requireGmailConfig() {
  if (!env.GMAIL_CLIENT_ID || !env.GMAIL_CLIENT_SECRET) {
    throw new HttpError(400, "Gmail OAuth is not configured");
  }
}

function encryptionKey() {
  return crypto.createHash("sha256").update(env.JWT_SECRET).digest();
}

function encrypt(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((part) => part.toString("base64url")).join(".");
}

function decrypt(value: string) {
  const [ivValue, authTagValue, encryptedValue] = value.split(".");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url")
  );
  decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

function signState(payload: string) {
  return crypto.createHmac("sha256", env.JWT_SECRET).update(payload).digest("base64url");
}

function createState(userId: string) {
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      nonce: crypto.randomBytes(16).toString("base64url"),
      createdAt: Date.now()
    })
  ).toString("base64url");

  return `${payload}.${signState(payload)}`;
}

function readState(state: string) {
  const [payload, signature] = state.split(".");

  if (!payload || !signature || signature !== signState(payload)) {
    throw new HttpError(400, "Invalid Gmail OAuth state");
  }

  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    userId?: string;
    createdAt?: number;
  };

  if (!parsed.userId || !parsed.createdAt || Date.now() - parsed.createdAt > 10 * 60 * 1000) {
    throw new HttpError(400, "Expired Gmail OAuth state");
  }

  return parsed.userId;
}

function header(message: GmailMessageResponse, name: string) {
  return message.payload?.headers?.find((item) => item.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
}

function hasAny(text: string, terms: string[]) {
  const normalizedText = normalize(text);
  return terms.some((term) => normalizedText.includes(normalize(term)));
}

function classifyEmail(subject: string, snippet: string) {
  const text = `${subject} ${snippet}`;

  if (hasAny(text, ["unfortunately", "not move forward", "will not be moving forward", "other candidates", "not selected", "reject"])) {
    return {
      detectionType: "rejection",
      suggestedStatus: "REJECTED" as JobStatus,
      confidence: 92,
      reason: "Email contains common rejection language."
    };
  }

  if (hasAny(text, ["interview", "schedule a call", "meet with", "availability", "calendar invite"])) {
    return {
      detectionType: "interview_invite",
      suggestedStatus: "INTERVIEW" as JobStatus,
      confidence: 88,
      reason: "Email appears to request or confirm an interview."
    };
  }

  if (hasAny(text, ["assessment", "coding challenge", "hackerrank", "codility", "take-home", "online test"])) {
    return {
      detectionType: "assessment",
      suggestedStatus: "ASSESSMENT" as JobStatus,
      confidence: 86,
      reason: "Email appears to include an assessment or coding challenge."
    };
  }

  if (hasAny(text, ["offer", "congratulations", "pleased to offer"])) {
    return {
      detectionType: "offer",
      suggestedStatus: "OFFER" as JobStatus,
      confidence: 90,
      reason: "Email appears to mention an offer."
    };
  }

  if (hasAny(text, ["recruiter", "talent acquisition", "next step", "following up", "reply"])) {
    return {
      detectionType: "recruiter_reply",
      suggestedStatus: "RECRUITER_REACHED_OUT" as JobStatus,
      confidence: 72,
      reason: "Email appears to be a recruiter or hiring-team reply."
    };
  }

  if (hasAny(text, ["thank you for applying", "application received", "we received your application"])) {
    return {
      detectionType: "application_confirmation",
      suggestedStatus: null,
      confidence: 64,
      reason: "Email appears to confirm an application was received."
    };
  }

  return {
    detectionType: "job_related",
    suggestedStatus: null,
    confidence: 45,
    reason: "Email matched job-search scan terms but needs review."
  };
}

function linkJob(messageText: string, jobs: Array<Pick<Job, "id" | "companyName" | "jobTitle">>) {
  const normalizedMessage = normalize(messageText);
  const ranked = jobs
    .map((job) => {
      const companyMatch = normalizedMessage.includes(normalize(job.companyName)) ? 4 : 0;
      const titleWords = normalize(job.jobTitle).split(" ").filter((word) => word.length > 2);
      const titleScore = titleWords.filter((word) => normalizedMessage.includes(word)).length;
      return { job, score: companyMatch + titleScore };
    })
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.score > 0 ? ranked[0].job.id : null;
}

async function exchangeCode(code: string) {
  requireGmailConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GMAIL_CLIENT_ID!,
      client_secret: env.GMAIL_CLIENT_SECRET!,
      redirect_uri: env.GMAIL_REDIRECT_URI,
      grant_type: "authorization_code"
    })
  });
  const payload = (await response.json().catch(() => ({}))) as GmailTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new HttpError(response.status, payload.error_description ?? "Unable to connect Gmail");
  }

  return payload;
}

async function refreshAccessToken(refreshToken: string) {
  requireGmailConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GMAIL_CLIENT_ID!,
      client_secret: env.GMAIL_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });
  const payload = (await response.json().catch(() => ({}))) as GmailTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new HttpError(response.status, payload.error_description ?? "Unable to refresh Gmail access");
  }

  return payload;
}

async function gmailFetch<T>(accessToken: string, url: string) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const payload = (await response.json().catch(() => ({}))) as T;

  if (!response.ok) {
    throw new HttpError(response.status, "Gmail API request failed");
  }

  return payload;
}

async function getAccessToken(userId: string) {
  const integration = await prisma.gmailIntegration.findUnique({ where: { userId } });

  if (!integration?.accessTokenEnc) {
    throw new HttpError(400, "Gmail is not connected");
  }

  if (integration.tokenExpiresAt && integration.tokenExpiresAt.getTime() > Date.now() + 60_000) {
    return decrypt(integration.accessTokenEnc);
  }

  if (!integration.refreshTokenEnc) {
    return decrypt(integration.accessTokenEnc);
  }

  const refreshToken = decrypt(integration.refreshTokenEnc);
  const payload = await refreshAccessToken(refreshToken);

  await prisma.gmailIntegration.update({
    where: { userId },
    data: {
      accessTokenEnc: encrypt(payload.access_token!),
      tokenExpiresAt: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000) : null,
      scope: payload.scope ?? integration.scope
    }
  });

  return payload.access_token!;
}

export function getGmailConnectUrl(userId: string) {
  requireGmailConfig();
  const params = new URLSearchParams({
    client_id: env.GMAIL_CLIENT_ID!,
    redirect_uri: env.GMAIL_REDIRECT_URI,
    response_type: "code",
    scope: gmailReadonlyScope,
    access_type: "offline",
    prompt: "consent",
    state: createState(userId)
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function connectGmailFromCallback(code: string, state: string) {
  const userId = readState(state);
  const tokenPayload = await exchangeCode(code);
  const profile = await gmailFetch<GmailProfileResponse>(
    tokenPayload.access_token!,
    "https://gmail.googleapis.com/gmail/v1/users/me/profile"
  );
  const existing = await prisma.gmailIntegration.findUnique({ where: { userId } });
  const refreshTokenEnc = tokenPayload.refresh_token
    ? encrypt(tokenPayload.refresh_token)
    : existing?.refreshTokenEnc;

  await prisma.gmailIntegration.upsert({
    where: { userId },
    update: {
      gmailEmail: profile.emailAddress,
      accessTokenEnc: encrypt(tokenPayload.access_token!),
      refreshTokenEnc,
      tokenExpiresAt: tokenPayload.expires_in ? new Date(Date.now() + tokenPayload.expires_in * 1000) : null,
      scope: tokenPayload.scope,
      connectedAt: new Date()
    },
    create: {
      userId,
      gmailEmail: profile.emailAddress,
      accessTokenEnc: encrypt(tokenPayload.access_token!),
      refreshTokenEnc,
      tokenExpiresAt: tokenPayload.expires_in ? new Date(Date.now() + tokenPayload.expires_in * 1000) : null,
      scope: tokenPayload.scope
    }
  });
}

export async function getGmailStatus(userId: string) {
  const integration = await prisma.gmailIntegration.findUnique({
    where: { userId },
    select: {
      gmailEmail: true,
      connectedAt: true,
      lastScanAt: true
    }
  });

  return {
    connected: Boolean(integration),
    gmailEmail: integration?.gmailEmail ?? null,
    connectedAt: integration?.connectedAt ?? null,
    lastScanAt: integration?.lastScanAt ?? null
  };
}

export async function scanGmail(userId: string, maxResults: number) {
  const accessToken = await getAccessToken(userId);
  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("q", detectionQuery);
  listUrl.searchParams.set("maxResults", String(maxResults));
  const [messageList, jobs] = await Promise.all([
    gmailFetch<GmailMessageListResponse>(accessToken, listUrl.toString()),
    prisma.job.findMany({
      where: { userId },
      select: { id: true, companyName: true, jobTitle: true }
    })
  ]);
  const scannedEmails = [];

  for (const message of messageList.messages ?? []) {
    const messageUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`);
    messageUrl.searchParams.set("format", "metadata");
    messageUrl.searchParams.append("metadataHeaders", "Subject");
    messageUrl.searchParams.append("metadataHeaders", "From");
    messageUrl.searchParams.append("metadataHeaders", "Date");
    const detail = await gmailFetch<GmailMessageResponse>(accessToken, messageUrl.toString());
    const subject = header(detail, "Subject") || "(No subject)";
    const fromEmail = header(detail, "From") || null;
    const snippet = detail.snippet ?? "";
    const receivedAt = detail.internalDate ? new Date(Number(detail.internalDate)) : (header(detail, "Date") ? new Date(header(detail, "Date")) : null);
    const classification = classifyEmail(subject, snippet);
    const jobId = linkJob(`${subject} ${snippet} ${fromEmail ?? ""}`, jobs);
    const jobEmail = await prisma.jobEmail.upsert({
      where: {
        userId_gmailMessageId: {
          userId,
          gmailMessageId: detail.id
        }
      },
      update: {
        jobId,
        gmailThreadId: detail.threadId,
        fromEmail,
        subject,
        snippet,
        receivedAt,
        detectionType: classification.detectionType,
        suggestedStatus: classification.suggestedStatus,
        confidence: classification.confidence,
        reason: classification.reason
      },
      create: {
        userId,
        jobId,
        gmailMessageId: detail.id,
        gmailThreadId: detail.threadId,
        fromEmail,
        subject,
        snippet,
        receivedAt,
        detectionType: classification.detectionType,
        suggestedStatus: classification.suggestedStatus,
        confidence: classification.confidence,
        reason: classification.reason
      },
      include: {
        job: { select: { id: true, companyName: true, jobTitle: true, status: true } },
        detections: true
      }
    });

    if (jobEmail.detections.length === 0) {
      await prisma.emailDetection.create({
        data: {
          jobEmailId: jobEmail.id,
          detectionType: classification.detectionType,
          suggestedStatus: classification.suggestedStatus,
          confidence: classification.confidence,
          reason: classification.reason
        }
      });
    }

    scannedEmails.push(jobEmail);
  }

  await prisma.gmailIntegration.update({
    where: { userId },
    data: { lastScanAt: new Date() }
  });

  return listGmailDetections(userId);
}

const jobEmailInclude = {
  job: {
    select: {
      id: true,
      companyName: true,
      jobTitle: true,
      status: true
    }
  },
  detections: {
    orderBy: { createdAt: "desc" as const }
  }
};

export async function listGmailDetections(userId: string) {
  return prisma.jobEmail.findMany({
    where: { userId },
    include: jobEmailInclude,
    orderBy: [{ decisionStatus: "asc" }, { receivedAt: "desc" }, { createdAt: "desc" }],
    take: 100
  });
}

export async function listJobEmails(userId: string, jobId: string) {
  const job = await prisma.job.findFirst({ where: { id: jobId, userId }, select: { id: true } });

  if (!job) {
    throw new HttpError(404, "Job not found");
  }

  return prisma.jobEmail.findMany({
    where: { userId, jobId },
    include: jobEmailInclude,
    orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }]
  });
}

async function updateApplicationFromEmail(userId: string, jobId: string, status: JobStatus, note: string) {
  const application = await prisma.application.findFirst({
    where: { userId, jobId },
    orderBy: { createdAt: "desc" }
  });

  if (application) {
    return prisma.application.update({
      where: { id: application.id },
      data: {
        status,
        notes: [application.notes, note].filter(Boolean).join("\n")
      }
    });
  }

  return prisma.application.create({
    data: {
      userId,
      jobId,
      status,
      notes: note
    }
  });
}

export async function confirmGmailDetection(userId: string, detectionId: string) {
  const detection = await prisma.emailDetection.findFirst({
    where: {
      id: detectionId,
      jobEmail: { userId }
    },
    include: { jobEmail: true }
  });

  if (!detection) {
    throw new HttpError(404, "Email detection not found");
  }

  const note = `Gmail: ${detection.jobEmail.subject}`;

  if (detection.jobEmail.jobId && detection.suggestedStatus) {
    await prisma.$transaction([
      prisma.job.update({
        where: { id: detection.jobEmail.jobId },
        data: { status: detection.suggestedStatus }
      }),
      prisma.jobEmail.update({
        where: { id: detection.jobEmail.id },
        data: { decisionStatus: "CONFIRMED" }
      }),
      prisma.emailDetection.update({
        where: { id: detection.id },
        data: { decisionStatus: "CONFIRMED", confirmedAt: new Date() }
      })
    ]);
    await updateApplicationFromEmail(userId, detection.jobEmail.jobId, detection.suggestedStatus, note);
  } else {
    await prisma.$transaction([
      prisma.jobEmail.update({
        where: { id: detection.jobEmail.id },
        data: { decisionStatus: "CONFIRMED" }
      }),
      prisma.emailDetection.update({
        where: { id: detection.id },
        data: { decisionStatus: "CONFIRMED", confirmedAt: new Date() }
      })
    ]);
  }

  return listGmailDetections(userId);
}

export async function ignoreGmailDetection(userId: string, detectionId: string) {
  const detection = await prisma.emailDetection.findFirst({
    where: {
      id: detectionId,
      jobEmail: { userId }
    },
    include: { jobEmail: true }
  });

  if (!detection) {
    throw new HttpError(404, "Email detection not found");
  }

  await prisma.$transaction([
    prisma.jobEmail.update({
      where: { id: detection.jobEmail.id },
      data: { decisionStatus: "IGNORED" }
    }),
    prisma.emailDetection.update({
      where: { id: detection.id },
      data: { decisionStatus: "IGNORED", ignoredAt: new Date() }
    })
  ]);

  return listGmailDetections(userId);
}
