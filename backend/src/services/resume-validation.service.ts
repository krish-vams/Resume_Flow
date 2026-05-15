import fs from "fs/promises";
import { inflateRawSync } from "zlib";
import type { Prisma, ValidationStatus } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { HttpError } from "../utils/http-error";
import { resolveStorageKey } from "./resume.service";

type CheckStatus = "passed" | "warning" | "failed";

type ValidationCheck = {
  name: string;
  status: CheckStatus;
  details: string;
};

type ZipEntry = {
  compression: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

const coreLanguages = [
  "Java",
  "Python",
  "Go",
  "Golang",
  "C#",
  ".NET",
  "Node.js",
  "JavaScript",
  "TypeScript",
  "Ruby",
  "PHP",
  "Scala",
  "Kotlin",
  "Swift",
  "C++"
];

const aiTerms = [
  "AI",
  "GenAI",
  "LLM",
  "ChatGPT",
  "Gemini",
  "Claude",
  "Copilot",
  "LangChain",
  "RAG",
  "OpenAI",
  "Anthropic",
  "LlamaIndex",
  "Vector DB",
  "Pinecone",
  "Bedrock"
];

const targetCompanies = {
  accenture: "Accenture",
  dreams: "Dreams Media Solutions",
  capital: "Capital Info Solutions"
} as const;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function countWords(value: string) {
  return normalizeWhitespace(value)
    .split(/\s+/)
    .filter(Boolean).length;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasTerm(value: string, term: string) {
  const escaped = escapeRegex(term);
  const boundaryStart = /^[a-zA-Z0-9]/.test(term) ? "\\b" : "";
  const boundaryEnd = /[a-zA-Z0-9]$/.test(term) ? "\\b" : "";
  return new RegExp(`${boundaryStart}${escaped}${boundaryEnd}`, "i").test(value);
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function stripXml(value: string) {
  return decodeXml(value.replace(/<[^>]+>/g, ""));
}

function readUInt32(buffer: Buffer, offset: number) {
  return buffer.readUInt32LE(offset);
}

function readUInt16(buffer: Buffer, offset: number) {
  return buffer.readUInt16LE(offset);
}

function findZipEntry(buffer: Buffer, entryName: string): ZipEntry | null {
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (readUInt32(buffer, offset) !== 0x06054b50) {
      continue;
    }

    const entryCount = readUInt16(buffer, offset + 10);
    const centralDirectoryOffset = readUInt32(buffer, offset + 16);
    let cursor = centralDirectoryOffset;

    for (let index = 0; index < entryCount; index += 1) {
      if (readUInt32(buffer, cursor) !== 0x02014b50) {
        return null;
      }

      const compression = readUInt16(buffer, cursor + 10);
      const compressedSize = readUInt32(buffer, cursor + 20);
      const uncompressedSize = readUInt32(buffer, cursor + 24);
      const fileNameLength = readUInt16(buffer, cursor + 28);
      const extraLength = readUInt16(buffer, cursor + 30);
      const commentLength = readUInt16(buffer, cursor + 32);
      const localHeaderOffset = readUInt32(buffer, cursor + 42);
      const fileName = buffer.toString("utf8", cursor + 46, cursor + 46 + fileNameLength);

      if (fileName === entryName) {
        return {
          compression,
          compressedSize,
          uncompressedSize,
          localHeaderOffset
        };
      }

      cursor += 46 + fileNameLength + extraLength + commentLength;
    }
  }

  return null;
}

function extractZipEntry(buffer: Buffer, entryName: string) {
  const entry = findZipEntry(buffer, entryName);

  if (!entry) {
    throw new HttpError(400, "Invalid DOCX");
  }

  const fileNameLength = readUInt16(buffer, entry.localHeaderOffset + 26);
  const extraLength = readUInt16(buffer, entry.localHeaderOffset + 28);
  const dataStart = entry.localHeaderOffset + 30 + fileNameLength + extraLength;
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.compression === 0) {
    return compressed.toString("utf8");
  }

  if (entry.compression !== 8) {
    throw new HttpError(400, "Invalid DOCX");
  }

  const inflated = inflateRawSync(compressed);

  if (inflated.length !== entry.uncompressedSize) {
    throw new HttpError(400, "Invalid DOCX");
  }

  return inflated.toString("utf8");
}

function extractDocxTextWithBoldMarkers(buffer: Buffer) {
  const documentXml = extractZipEntry(buffer, "word/document.xml");
  const paragraphs = documentXml.match(/<w:p[\s\S]*?<\/w:p>/g) ?? [];

  return paragraphs
    .map((paragraph) => {
      const runs = paragraph.match(/<w:r[\s\S]*?<\/w:r>/g) ?? [];
      const text = runs
        .map((run) => {
          const isBold = /<w:b(?:\s|\/|>)/.test(run) && !/<w:b[^>]*w:val="(?:false|0)"/.test(run);
          const runText = (run.match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g) ?? [])
            .map((part) => stripXml(part))
            .join("");

          return isBold && runText.trim() ? `**${runText}**` : runText;
        })
        .join("");

      return normalizeWhitespace(text);
    })
    .filter(Boolean)
    .join("\n");
}

function headingKey(line: string) {
  return normalizeWhitespace(line)
    .replace(/\*\*/g, "")
    .replace(/:$/, "")
    .toLowerCase();
}

function splitSections(text: string) {
  const sections: Record<string, string[]> = {};
  let current = "";

  for (const line of text.split(/\r?\n/).map((value) => value.trim()).filter(Boolean)) {
    const key = headingKey(line);
    if (["professional summary", "summary", "experience", "professional experience", "work experience", "skills", "technical skills", "education"].includes(key)) {
      current = key.includes("summary")
        ? "professionalSummary"
        : key.includes("experience")
          ? "experience"
          : key.includes("skills")
            ? "skills"
            : "education";
      sections[current] = sections[current] ?? [];
      continue;
    }

    if (current) {
      sections[current].push(line);
    }
  }

  return sections;
}

function getBulletText(line: string) {
  return normalizeWhitespace(line.replace(/^[-*•\u2022]\s*/, ""));
}

function parseExperience(lines: string[]) {
  const bullets = {
    accenture: [] as string[],
    dreams: [] as string[],
    capital: [] as string[]
  };
  const headers: string[] = [];
  let currentCompany: keyof typeof targetCompanies | null = null;

  for (const line of lines) {
    const normalizedLine = line.toLowerCase();
    const matchedCompany = Object.entries(targetCompanies).find(([, company]) =>
      normalizedLine.includes(company.toLowerCase())
    )?.[0] as keyof typeof targetCompanies | undefined;

    if (matchedCompany) {
      currentCompany = matchedCompany;
      headers.push(line);
      continue;
    }

    if (currentCompany && normalizeWhitespace(line)) {
      bullets[currentCompany].push(getBulletText(line));
    }
  }

  return { bullets, headers };
}

function parseSkills(lines: string[]) {
  const categories = new Map<string, string[]>();

  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (!match) {
      continue;
    }

    const [, category, values] = match;
    categories.set(
      normalizeWhitespace(category),
      values
        .split(/[,;|]/)
        .map((value) => normalizeWhitespace(value))
        .filter(Boolean)
    );
  }

  return categories;
}

function getJsonList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (typeof entry === "string") {
        return entry;
      }

      if (entry && typeof entry === "object") {
        return Object.values(entry).find((item): item is string => typeof item === "string") ?? "";
      }

      return "";
    })
    .map((entry) => normalizeWhitespace(entry))
    .filter(Boolean);
}

function isTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => /^[A-Z0-9.#/+]/.test(word));
}

function addCheck(checks: ValidationCheck[], name: string, status: CheckStatus, details: string) {
  checks.push({ name, status, details });
}

async function getResumeForValidation(userId: string, resumeId: string) {
  const resume = await prisma.resumeVersion.findFirst({
    where: { id: resumeId, userId },
    include: {
      job: true,
      candidateProfile: true,
      promptTemplate: true
    }
  });

  if (!resume) {
    throw new HttpError(404, "Resume version not found");
  }

  return resume;
}

async function getResumeText(resume: Awaited<ReturnType<typeof getResumeForValidation>>) {
  if (resume.rawResumeText?.trim()) {
    return resume.rawResumeText;
  }

  if (!resume.rawResumeFileUrl) {
    throw new HttpError(400, "Raw resume text or DOCX is required before validation");
  }

  try {
    const buffer = await fs.readFile(resolveStorageKey(resume.rawResumeFileUrl));
    return extractDocxTextWithBoldMarkers(buffer);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(400, "Invalid DOCX");
  }
}

function buildValidationResult(
  resume: Awaited<ReturnType<typeof getResumeForValidation>>,
  resumeText: string
) {
  const checks: ValidationCheck[] = [];
  const sections = splitSections(resumeText);
  const summary = normalizeWhitespace((sections.professionalSummary ?? []).join(" "));
  const firstSummarySentence = summary.match(/^[^.!?]+[.!?]?/)?.[0] ?? "";
  const experience = parseExperience(sections.experience ?? []);
  const skills = parseSkills(sections.skills ?? []);
  const educationText = normalizeWhitespace((sections.education ?? []).join(" "));
  const allBullets = Object.values(experience.bullets).flat();
  const invalidBullets = allBullets
    .map((bullet) => ({ bullet, wordCount: countWords(bullet) }))
    .filter((bullet) => bullet.wordCount < 20 || bullet.wordCount > 24);
  const languageViolations = allBullets
    .map((bullet) => ({
      bullet,
      languages: coreLanguages.filter((language) => hasTerm(bullet, language))
    }))
    .filter((violation) => violation.languages.length > 1);
  const restrictedAiBullets = [...experience.bullets.dreams, ...experience.bullets.capital]
    .map((bullet) => ({
      bullet,
      terms: aiTerms.filter((term) => hasTerm(bullet, term))
    }))
    .filter((violation) => violation.terms.length > 0);
  const requiredSkills = getJsonList(resume.job.requiredSkillsJson);
  const preferredSkills = getJsonList(resume.job.preferredSkillsJson);
  const skillValues = Array.from(skills.values()).flat();
  const skillText = skillValues.join(" ");
  const missingRequiredSkills = requiredSkills.filter((skill) => !hasTerm(skillText, skill));
  const missingPreferredSkills = preferredSkills.filter((skill) => !hasTerm(skillText, skill));
  const shortSkillCategories = Array.from(skills.entries()).filter(([, values]) => values.length < 5);
  const nonTitleCaseSkills = skillValues.filter((skill) => !isTitleCase(skill));
  const importantTerms = Array.from(
    new Set([
      ...requiredSkills,
      ...preferredSkills,
      ...(resume.job.jdKeywordsJson && typeof resume.job.jdKeywordsJson === "object" && "all" in resume.job.jdKeywordsJson
        ? getJsonList((resume.job.jdKeywordsJson as { all?: unknown }).all)
        : [])
    ])
  ).slice(0, 20);
  const boldMarkerViolations = importantTerms.filter((term) => hasTerm(resumeText, term) && !resumeText.includes(`**${term}**`));
  const headerLocationViolations = experience.headers.filter((header) => /,\s*[A-Z][a-z]+|remote|texas|tx|california|ca|new york|ny|india/i.test(header));
  const candidateProfile = resume.candidateProfile;
  const contactViolations = [
    candidateProfile?.fullName && !hasTerm(resumeText, candidateProfile.fullName) ? "Candidate name missing or incorrect" : "",
    candidateProfile?.email && !resumeText.toLowerCase().includes(candidateProfile.email.toLowerCase()) ? "Email missing or incorrect" : "",
    candidateProfile?.phone && !resumeText.includes(candidateProfile.phone) ? "Phone missing or incorrect" : "",
    candidateProfile?.location && !resumeText.toLowerCase().includes(candidateProfile.location.toLowerCase()) ? "Location missing or incorrect" : ""
  ].filter(Boolean);

  addCheck(
    checks,
    "Professional Summary Exists",
    summary ? "passed" : "failed",
    summary ? "Professional Summary found" : "Professional Summary is missing"
  );
  addCheck(
    checks,
    "Professional Summary Word Count",
    summary && countWords(summary) >= 55 && countWords(summary) <= 60 ? "passed" : "warning",
    summary ? `${countWords(summary)} words` : "No summary to count"
  );
  addCheck(
    checks,
    "Professional Summary Job Title",
    firstSummarySentence && hasTerm(firstSummarySentence, resume.job.jobTitle) ? "passed" : "warning",
    summary ? `Expected title: ${resume.job.jobTitle}` : "No summary to inspect"
  );
  addCheck(
    checks,
    "Accenture Bullet Count",
    experience.bullets.accenture.length === 8 ? "passed" : "failed",
    `${experience.bullets.accenture.length} bullets`
  );
  addCheck(
    checks,
    "Dreams Media Solutions Bullet Count",
    experience.bullets.dreams.length === 6 ? "passed" : "failed",
    `${experience.bullets.dreams.length} bullets`
  );
  addCheck(
    checks,
    "Capital Info Solutions Bullet Count",
    experience.bullets.capital.length === 5 ? "passed" : "failed",
    `${experience.bullets.capital.length} bullets`
  );
  addCheck(
    checks,
    "Bullet Word Count",
    invalidBullets.length === 0 ? "passed" : "warning",
    invalidBullets.length === 0 ? "All bullets are 20-24 words" : `${invalidBullets.length} bullets outside 20-24 words`
  );
  addCheck(
    checks,
    "Programming Language Rule",
    languageViolations.length === 0 ? "passed" : "warning",
    languageViolations.length === 0 ? "No bullet mixes multiple core languages" : `${languageViolations.length} bullets mix multiple core languages`
  );
  addCheck(
    checks,
    "AI Tool Rule",
    restrictedAiBullets.length === 0 ? "passed" : "failed",
    restrictedAiBullets.length === 0 ? "No AI terms found in Dreams Media or Capital Info bullets" : `${restrictedAiBullets.length} restricted AI references found`
  );
  addCheck(
    checks,
    "Skills Categories",
    skills.size >= 8 && Array.from(skills.keys()).some((category) => category.toLowerCase() === "certifications") ? "passed" : "warning",
    `${skills.size} categories found${Array.from(skills.keys()).some((category) => category.toLowerCase() === "certifications") ? "" : "; Certifications missing"}`
  );
  addCheck(
    checks,
    "Skills Per Category",
    shortSkillCategories.length === 0 ? "passed" : "warning",
    shortSkillCategories.length === 0 ? "Each category has at least 5 skills" : `${shortSkillCategories.length} categories have fewer than 5 skills`
  );
  addCheck(
    checks,
    "Required JD Skills",
    missingRequiredSkills.length === 0 ? "passed" : "warning",
    requiredSkills.length === 0 ? "No required skills were extracted for this JD" : `${missingRequiredSkills.length} required skills missing`
  );
  addCheck(
    checks,
    "Preferred JD Skills",
    missingPreferredSkills.length === 0 ? "passed" : "warning",
    preferredSkills.length === 0 ? "No preferred skills were extracted for this JD" : `${missingPreferredSkills.length} preferred skills missing`
  );
  addCheck(
    checks,
    "Skills Title Case",
    nonTitleCaseSkills.length === 0 ? "passed" : "warning",
    nonTitleCaseSkills.length === 0 ? "Skills are title case" : `${nonTitleCaseSkills.length} skills are not title case`
  );
  addCheck(
    checks,
    "Bold Marker Validation",
    boldMarkerViolations.length === 0 ? "passed" : "warning",
    boldMarkerViolations.length === 0 ? "Important terms are bolded where detected" : `${boldMarkerViolations.length} important terms are not bolded`
  );
  addCheck(
    checks,
    "Header Validation",
    headerLocationViolations.length === 0 && contactViolations.length === 0 && Boolean(educationText) ? "passed" : "failed",
    [
      headerLocationViolations.length ? `${headerLocationViolations.length} experience headers may include locations` : "",
      contactViolations.length ? contactViolations.join(", ") : "",
      educationText ? "" : "Education missing"
    ].filter(Boolean).join("; ") || "Headers, contact info, and education look valid"
  );

  const failedCount = checks.filter((check) => check.status === "failed").length;
  const warningCount = checks.filter((check) => check.status === "warning").length;
  const overallScore = Math.max(0, 100 - failedCount * 12 - warningCount * 5);
  const overallStatus: ValidationStatus = failedCount > 0 ? "FAILED" : warningCount > 0 ? "WARNING" : "PASSED";

  return {
    overallStatus,
    overallScore,
    checks,
    summaryWordCount: summary ? countWords(summary) : null,
    accentureBulletCount: experience.bullets.accenture.length,
    dreamsBulletCount: experience.bullets.dreams.length,
    capitalBulletCount: experience.bullets.capital.length,
    invalidBullets,
    missingRequiredSkills,
    missingPreferredSkills,
    languageViolations,
    aiToolViolations: restrictedAiBullets,
    boldMarkerViolations,
    headerLocationViolations,
    contactViolations,
    shortSkillCategories: shortSkillCategories.map(([category, values]) => ({ category, skillCount: values.length })),
    nonTitleCaseSkills
  };
}

const validationSelect = {
  id: true,
  resumeVersionId: true,
  summaryWordCount: true,
  accentureBulletCount: true,
  dreamsBulletCount: true,
  capitalBulletCount: true,
  invalidBulletsJson: true,
  missingRequiredSkillsJson: true,
  missingPreferredSkillsJson: true,
  languageRuleViolationsJson: true,
  aiToolViolationsJson: true,
  boldMarkerViolationsJson: true,
  checksJson: true,
  overallScore: true,
  overallStatus: true,
  createdAt: true
};

export async function validateResumeVersion(userId: string, resumeId: string) {
  const resume = await getResumeForValidation(userId, resumeId);
  const resumeText = await getResumeText(resume);
  const result = buildValidationResult(resume, resumeText);

  const validation = await prisma.resumeValidation.upsert({
    where: { resumeVersionId: resume.id },
    update: {
      summaryWordCount: result.summaryWordCount,
      accentureBulletCount: result.accentureBulletCount,
      dreamsBulletCount: result.dreamsBulletCount,
      capitalBulletCount: result.capitalBulletCount,
      invalidBulletsJson: result.invalidBullets as unknown as Prisma.InputJsonValue,
      missingRequiredSkillsJson: result.missingRequiredSkills as Prisma.InputJsonValue,
      missingPreferredSkillsJson: result.missingPreferredSkills as Prisma.InputJsonValue,
      languageRuleViolationsJson: result.languageViolations as unknown as Prisma.InputJsonValue,
      aiToolViolationsJson: result.aiToolViolations as unknown as Prisma.InputJsonValue,
      boldMarkerViolationsJson: result.boldMarkerViolations as Prisma.InputJsonValue,
      checksJson: result.checks as unknown as Prisma.InputJsonValue,
      overallScore: result.overallScore,
      overallStatus: result.overallStatus
    },
    create: {
      resumeVersionId: resume.id,
      summaryWordCount: result.summaryWordCount,
      accentureBulletCount: result.accentureBulletCount,
      dreamsBulletCount: result.dreamsBulletCount,
      capitalBulletCount: result.capitalBulletCount,
      invalidBulletsJson: result.invalidBullets as unknown as Prisma.InputJsonValue,
      missingRequiredSkillsJson: result.missingRequiredSkills as Prisma.InputJsonValue,
      missingPreferredSkillsJson: result.missingPreferredSkills as Prisma.InputJsonValue,
      languageRuleViolationsJson: result.languageViolations as unknown as Prisma.InputJsonValue,
      aiToolViolationsJson: result.aiToolViolations as unknown as Prisma.InputJsonValue,
      boldMarkerViolationsJson: result.boldMarkerViolations as Prisma.InputJsonValue,
      checksJson: result.checks as unknown as Prisma.InputJsonValue,
      overallScore: result.overallScore,
      overallStatus: result.overallStatus
    },
    select: validationSelect
  });

  await prisma.resumeVersion.update({
    where: { id: resume.id },
    data: {
      validationStatus: result.overallStatus,
      status: result.overallStatus === "FAILED" ? "Validation Failed" : "Validated"
    }
  });

  return validation;
}

export async function getResumeValidation(userId: string, resumeId: string) {
  await getResumeForValidation(userId, resumeId);

  const validation = await prisma.resumeValidation.findUnique({
    where: { resumeVersionId: resumeId },
    select: validationSelect
  });

  if (!validation) {
    throw new HttpError(404, "Resume validation not found");
  }

  return validation;
}
