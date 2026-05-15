import type { JobStatus, Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { HttpError } from "../utils/http-error";
import { analyzeEligibility, type EligibilityResult } from "./eligibility.service";
import { extractKeywords, recommendFocusTemplate, type FocusRecommendation } from "./jd-analysis.service";

type JobInput = {
  companyName?: string;
  jobTitle?: string;
  jobUrl?: string;
  location?: string;
  jobType?: string;
  jobDescription?: string;
  notes?: string;
  seniorityLevel?: string;
  recommendedFocusTemplateId?: string | null;
  status?: JobStatus;
};

const jobSelect = {
  id: true,
  userId: true,
  companyName: true,
  jobTitle: true,
  location: true,
  jobUrl: true,
  jobType: true,
  jobDescription: true,
  seniorityLevel: true,
  requiredSkillsJson: true,
  preferredSkillsJson: true,
  jdKeywordsJson: true,
  eligibilityFlagsJson: true,
  focusRecommendationJson: true,
  recommendedFocusTemplateId: true,
  recommendedFocusTemplate: {
    select: {
      id: true,
      name: true,
      focusType: true
    }
  },
  status: true,
  notes: true,
  _count: {
    select: {
      resumeVersions: true,
      applications: true
    }
  },
  createdAt: true,
  updatedAt: true
};

function serializeEligibilityFlags(result: EligibilityResult): Prisma.InputJsonValue {
  return {
    passed: result.passed,
    restrictedTermsFound: result.restrictedTermsFound,
    severity: result.severity,
    analyzedAt: new Date().toISOString()
  };
}

function serializeFocusRecommendation(result: FocusRecommendation): Prisma.InputJsonValue {
  return {
    recommendedFocus: result.recommendedFocus,
    recommendedFocusType: result.recommendedFocusType,
    recommendedFocusTemplateId: result.recommendedFocusTemplateId,
    confidence: result.confidence,
    matchedKeywords: result.matchedKeywords,
    reason: result.reason,
    analyzedAt: new Date().toISOString()
  };
}

export async function createJob(userId: string, input: Required<Pick<JobInput, "companyName" | "jobTitle" | "jobDescription">> & JobInput) {
  const eligibilityResult = analyzeEligibility(input.jobDescription);

  return prisma.job.create({
    data: {
      userId,
      companyName: input.companyName,
      jobTitle: input.jobTitle,
      jobUrl: input.jobUrl,
      location: input.location,
      jobType: input.jobType,
      jobDescription: input.jobDescription,
      notes: input.notes,
      seniorityLevel: input.seniorityLevel,
      eligibilityFlagsJson: serializeEligibilityFlags(eligibilityResult),
      recommendedFocusTemplateId: input.recommendedFocusTemplateId,
      status: input.status
    },
    select: jobSelect
  });
}

export async function listJobs(userId: string) {
  return prisma.job.findMany({
    where: { userId },
    select: jobSelect,
    orderBy: { createdAt: "desc" }
  });
}

export async function getJob(userId: string, jobId: string) {
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      userId
    },
    select: jobSelect
  });

  if (!job) {
    throw new HttpError(404, "Job not found");
  }

  return job;
}

export async function updateJob(userId: string, jobId: string, input: JobInput) {
  await getJob(userId, jobId);
  const eligibilityFlagsJson =
    input.jobDescription === undefined
      ? undefined
      : serializeEligibilityFlags(analyzeEligibility(input.jobDescription));
  const jdKeywordsJson =
    input.jobDescription === undefined
      ? undefined
      : (extractKeywords(input.jobDescription) as unknown as Prisma.InputJsonValue);

  return prisma.job.update({
    where: { id: jobId },
    data: {
      ...input,
      eligibilityFlagsJson,
      jdKeywordsJson
    },
    select: jobSelect
  });
}

export async function analyzeJobEligibility(userId: string, jobId: string) {
  const job = await getJob(userId, jobId);
  const eligibilityResult = analyzeEligibility(job.jobDescription);

  const updatedJob = await prisma.job.update({
    where: { id: jobId },
    data: {
      eligibilityFlagsJson: serializeEligibilityFlags(eligibilityResult)
    },
    select: jobSelect
  });

  return {
    analysis: eligibilityResult,
    job: updatedJob
  };
}

export async function analyzeJob(userId: string, jobId: string) {
  const [job, focusTemplates] = await Promise.all([
    getJob(userId, jobId),
    prisma.resumeFocusTemplate.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        focusType: true
      }
    })
  ]);
  const eligibilityResult = analyzeEligibility(job.jobDescription);
  const extractedKeywords = extractKeywords(job.jobDescription);
  const focusRecommendation = recommendFocusTemplate(job.jobDescription, focusTemplates);

  const updatedJob = await prisma.job.update({
    where: { id: jobId },
    data: {
      eligibilityFlagsJson: serializeEligibilityFlags(eligibilityResult),
      jdKeywordsJson: extractedKeywords as unknown as Prisma.InputJsonValue,
      focusRecommendationJson: serializeFocusRecommendation(focusRecommendation),
      recommendedFocusTemplateId: focusRecommendation.recommendedFocusTemplateId
    },
    select: jobSelect
  });

  return {
    eligibility: eligibilityResult,
    extractedKeywords,
    focusRecommendation,
    job: updatedJob
  };
}

export async function deleteJob(userId: string, jobId: string) {
  await getJob(userId, jobId);

  await prisma.job.delete({
    where: { id: jobId }
  });
}
