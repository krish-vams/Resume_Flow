import fs from "fs/promises";
import { inflateRawSync } from "zlib";
import type { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { HttpError } from "../utils/http-error";
import { resolveStorageKey } from "./resume.service";

type MatchCoverage = {
  matched: string[];
  missing: string[];
  coverage: number;
};

type ZipEntry = {
  compression: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

const languageKeywords = ["Java", "Python", "Go", "Golang", "C#", ".NET", "Node.js", "JavaScript", "TypeScript", "C++"];
const cloudDevopsKeywords = [
  "AWS",
  "Azure",
  "GCP",
  "Docker",
  "Kubernetes",
  "Terraform",
  "Jenkins",
  "GitHub Actions",
  "CI/CD",
  "EKS",
  "EC2",
  "Lambda",
  "RDS",
  "CloudWatch"
];
const databaseKeywords = ["PostgreSQL", "MySQL", "MongoDB", "DynamoDB", "Redis", "SQL Server", "Oracle", "RDS", "NoSQL"];
const frameworkKeywords = [
  "Spring Boot",
  "Spring Security",
  "Hibernate",
  "JPA",
  "Express.js",
  "NestJS",
  "React",
  "Next.js",
  "ASP.NET",
  "ASP.NET Core",
  "Entity Framework",
  "GraphQL",
  "REST APIs",
  "Kafka",
  "gRPC"
];

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
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

function uniqueTerms(terms: string[]) {
  const seen = new Set<string>();

  return terms
    .map((term) => normalizeWhitespace(term.replace(/\*\*/g, "")))
    .filter((term) => term.length > 1)
    .filter((term) => {
      const key = term.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
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
    .map(normalizeWhitespace)
    .filter(Boolean);
}

function getJdKeywordList(value: unknown) {
  if (!value || typeof value !== "object") {
    return [];
  }

  const keywordRecord = value as { all?: unknown; byFocusType?: Record<string, unknown> };
  return uniqueTerms([
    ...getJsonList(keywordRecord.all),
    ...(keywordRecord.byFocusType ? Object.values(keywordRecord.byFocusType).flatMap(getJsonList) : [])
  ]);
}

function findTerms(text: string, terms: string[]) {
  return uniqueTerms(terms).filter((term) => hasTerm(text, term));
}

function coverage(resumeText: string, jdText: string, keywords: string[]): MatchCoverage {
  const jdTerms = findTerms(jdText, keywords);
  const matched = jdTerms.filter((term) => hasTerm(resumeText, term));
  const missing = jdTerms.filter((term) => !hasTerm(resumeText, term));

  return {
    matched,
    missing,
    coverage: jdTerms.length === 0 ? 100 : Math.round((matched.length / jdTerms.length) * 100)
  };
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

function extractDocxText(buffer: Buffer) {
  const documentXml = extractZipEntry(buffer, "word/document.xml");
  const paragraphs = documentXml.match(/<w:p[\s\S]*?<\/w:p>/g) ?? [];

  return paragraphs
    .map((paragraph) =>
      normalizeWhitespace(
        (paragraph.match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g) ?? [])
          .map((part) => stripXml(part))
          .join("")
      )
    )
    .filter(Boolean)
    .join("\n");
}

async function getResumeForMatch(userId: string, resumeId: string) {
  const resume = await prisma.resumeVersion.findFirst({
    where: { id: resumeId, userId },
    include: {
      job: true,
      focusTemplate: true
    }
  });

  if (!resume) {
    throw new HttpError(404, "Resume version not found");
  }

  return resume;
}

async function getResumeText(resume: Awaited<ReturnType<typeof getResumeForMatch>>) {
  if (resume.rawResumeText?.trim()) {
    return resume.rawResumeText;
  }

  if (!resume.rawResumeFileUrl) {
    throw new HttpError(400, "Raw resume text or DOCX is required before match analysis");
  }

  try {
    const buffer = await fs.readFile(resolveStorageKey(resume.rawResumeFileUrl));
    return extractDocxText(buffer);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(400, "Invalid DOCX");
  }
}

async function getReferenceKeywords(userId: string, jobDescription: string) {
  const referenceEntries = await prisma.referenceEntry.findMany({
    where: {
      referenceFile: { userId },
      category: "ATS_KEYWORDS"
    },
    select: {
      title: true,
      content: true,
      tagsJson: true
    },
    take: 300
  });

  const terms = uniqueTerms(
    referenceEntries.flatMap((entry) => [
      entry.title ?? "",
      entry.content,
      ...getJsonList(entry.tagsJson)
    ])
  );

  return findTerms(jobDescription, terms);
}

function buildSuggestions(input: {
  missingRequiredSkills: string[];
  missingPreferredSkills: string[];
  cloudCoverage: MatchCoverage;
  databaseCoverage: MatchCoverage;
  frameworkCoverage: MatchCoverage;
}) {
  const suggestions: string[] = [];

  for (const skill of input.missingRequiredSkills.slice(0, 5)) {
    suggestions.push(`Add one authentic bullet or Skills entry for ${skill} if it reflects real project experience.`);
  }

  for (const skill of input.missingPreferredSkills.slice(0, 3)) {
    suggestions.push(`Consider adding ${skill} where it naturally fits, especially if it appears in prior work or certifications.`);
  }

  if (input.cloudCoverage.missing.length > 0) {
    suggestions.push(`Strengthen cloud/DevOps alignment by covering ${input.cloudCoverage.missing.slice(0, 3).join(", ")} only where truthful.`);
  }

  if (input.databaseCoverage.missing.length > 0) {
    suggestions.push(`Add database coverage for ${input.databaseCoverage.missing.slice(0, 3).join(", ")} if the candidate has used them.`);
  }

  if (input.frameworkCoverage.missing.length > 0) {
    suggestions.push(`Reflect framework expectations such as ${input.frameworkCoverage.missing.slice(0, 3).join(", ")} in Skills or relevant bullets.`);
  }

  if (suggestions.length === 0) {
    suggestions.push("The resume covers the main JD terms. Review bullets for measurable impact and role-specific wording before applying.");
  }

  return suggestions.slice(0, 8);
}

function scoreMatch(input: {
  requiredCoverage: MatchCoverage;
  preferredCoverage: MatchCoverage;
  referenceCoverage: MatchCoverage;
  primaryLanguageAligned: boolean;
  cloudCoverage: MatchCoverage;
  databaseCoverage: MatchCoverage;
  frameworkCoverage: MatchCoverage;
}) {
  const score =
    input.requiredCoverage.coverage * 0.36 +
    input.preferredCoverage.coverage * 0.18 +
    input.referenceCoverage.coverage * 0.12 +
    (input.primaryLanguageAligned ? 100 : 35) * 0.14 +
    input.cloudCoverage.coverage * 0.08 +
    input.databaseCoverage.coverage * 0.06 +
    input.frameworkCoverage.coverage * 0.06;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function analyzeResumeMatch(userId: string, resumeId: string) {
  const resume = await getResumeForMatch(userId, resumeId);
  const resumeText = await getResumeText(resume);
  const jobDescription = resume.job.jobDescription;
  const extractedJdTerms = uniqueTerms([
    ...getJsonList(resume.job.requiredSkillsJson),
    ...getJsonList(resume.job.preferredSkillsJson),
    ...getJdKeywordList(resume.job.jdKeywordsJson),
    ...findTerms(jobDescription, [...languageKeywords, ...cloudDevopsKeywords, ...databaseKeywords, ...frameworkKeywords])
  ]);
  const requiredSkills = uniqueTerms(getJsonList(resume.job.requiredSkillsJson));
  const preferredSkills = uniqueTerms(getJsonList(resume.job.preferredSkillsJson));
  const fallbackRequiredSkills = requiredSkills.length > 0 ? requiredSkills : extractedJdTerms;
  const referenceKeywords = await getReferenceKeywords(userId, jobDescription);
  const requiredCoverage = coverage(resumeText, jobDescription, fallbackRequiredSkills);
  const preferredCoverage = coverage(resumeText, jobDescription, preferredSkills);
  const referenceCoverage = coverage(resumeText, jobDescription, referenceKeywords);
  const cloudCoverage = coverage(resumeText, jobDescription, cloudDevopsKeywords);
  const databaseCoverage = coverage(resumeText, jobDescription, databaseKeywords);
  const frameworkCoverage = coverage(resumeText, jobDescription, frameworkKeywords);
  const jdLanguages = findTerms(jobDescription, languageKeywords);
  const resumeLanguages = findTerms(resumeText, languageKeywords);
  const primaryLanguage = resume.focusTemplate?.primaryLanguage || jdLanguages[0] || null;
  const primaryLanguageAligned = primaryLanguage ? hasTerm(resumeText, primaryLanguage) : jdLanguages.every((language) => hasTerm(resumeText, language));
  const matchedSkills = uniqueTerms([...requiredCoverage.matched, ...preferredCoverage.matched, ...referenceCoverage.matched]);
  const missingRequiredSkills = requiredCoverage.missing;
  const missingPreferredSkills = preferredCoverage.missing;
  const suggestions = buildSuggestions({
    missingRequiredSkills,
    missingPreferredSkills,
    cloudCoverage,
    databaseCoverage,
    frameworkCoverage
  });
  const matchScore = scoreMatch({
    requiredCoverage,
    preferredCoverage,
    referenceCoverage,
    primaryLanguageAligned,
    cloudCoverage,
    databaseCoverage,
    frameworkCoverage
  });
  const primaryLanguageAlignment = {
    primaryLanguage,
    jdLanguages,
    resumeLanguages,
    aligned: primaryLanguageAligned
  };

  const matchAnalysis = await prisma.resumeMatchAnalysis.upsert({
    where: { resumeVersionId: resume.id },
    update: {
      matchScore,
      matchedSkillsJson: matchedSkills as Prisma.InputJsonValue,
      matchedRequiredSkillsJson: requiredCoverage.matched as Prisma.InputJsonValue,
      missingRequiredSkillsJson: missingRequiredSkills as Prisma.InputJsonValue,
      matchedPreferredSkillsJson: preferredCoverage.matched as Prisma.InputJsonValue,
      missingPreferredSkillsJson: missingPreferredSkills as Prisma.InputJsonValue,
      primaryLanguageAlignmentJson: primaryLanguageAlignment as Prisma.InputJsonValue,
      cloudDevopsCoverageJson: cloudCoverage as unknown as Prisma.InputJsonValue,
      databaseCoverageJson: databaseCoverage as unknown as Prisma.InputJsonValue,
      frameworkCoverageJson: frameworkCoverage as unknown as Prisma.InputJsonValue,
      referenceKeywordCoverageJson: referenceCoverage as unknown as Prisma.InputJsonValue,
      suggestionsJson: suggestions as Prisma.InputJsonValue
    },
    create: {
      resumeVersionId: resume.id,
      matchScore,
      matchedSkillsJson: matchedSkills as Prisma.InputJsonValue,
      matchedRequiredSkillsJson: requiredCoverage.matched as Prisma.InputJsonValue,
      missingRequiredSkillsJson: missingRequiredSkills as Prisma.InputJsonValue,
      matchedPreferredSkillsJson: preferredCoverage.matched as Prisma.InputJsonValue,
      missingPreferredSkillsJson: missingPreferredSkills as Prisma.InputJsonValue,
      primaryLanguageAlignmentJson: primaryLanguageAlignment as Prisma.InputJsonValue,
      cloudDevopsCoverageJson: cloudCoverage as unknown as Prisma.InputJsonValue,
      databaseCoverageJson: databaseCoverage as unknown as Prisma.InputJsonValue,
      frameworkCoverageJson: frameworkCoverage as unknown as Prisma.InputJsonValue,
      referenceKeywordCoverageJson: referenceCoverage as unknown as Prisma.InputJsonValue,
      suggestionsJson: suggestions as Prisma.InputJsonValue
    }
  });

  await prisma.resumeVersion.update({
    where: { id: resume.id },
    data: {
      matchScore,
      status: "Match Analyzed"
    }
  });

  return matchAnalysis;
}
