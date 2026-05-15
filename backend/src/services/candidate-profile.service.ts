import type { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { HttpError } from "../utils/http-error";

type CandidateProfileInput = {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  educationJson?: Array<Record<string, unknown>>;
  certificationsJson?: Array<Record<string, unknown>>;
  defaultResumeName?: string;
};

const profileSelect = {
  id: true,
  userId: true,
  fullName: true,
  email: true,
  phone: true,
  location: true,
  linkedinUrl: true,
  githubUrl: true,
  educationJson: true,
  certificationsJson: true,
  defaultResumeName: true,
  defaultTemplateId: true,
  createdAt: true,
  updatedAt: true
};

export async function createCandidateProfile(userId: string, input: Required<Pick<CandidateProfileInput, "fullName" | "email">> & CandidateProfileInput) {
  return prisma.candidateProfile.create({
    data: {
      userId,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      location: input.location,
      linkedinUrl: input.linkedinUrl,
      githubUrl: input.githubUrl,
      educationJson: input.educationJson as Prisma.InputJsonValue | undefined,
      certificationsJson: input.certificationsJson as Prisma.InputJsonValue | undefined,
      defaultResumeName: input.defaultResumeName
    },
    select: profileSelect
  });
}

export async function listCandidateProfiles(userId: string) {
  return prisma.candidateProfile.findMany({
    where: { userId },
    select: profileSelect,
    orderBy: { updatedAt: "desc" }
  });
}

export async function getCandidateProfile(userId: string, profileId: string) {
  const profile = await prisma.candidateProfile.findFirst({
    where: {
      id: profileId,
      userId
    },
    select: profileSelect
  });

  if (!profile) {
    throw new HttpError(404, "Candidate profile not found");
  }

  return profile;
}

export async function updateCandidateProfile(userId: string, profileId: string, input: CandidateProfileInput) {
  await getCandidateProfile(userId, profileId);

  return prisma.candidateProfile.update({
    where: { id: profileId },
    data: {
      ...input,
      educationJson: input.educationJson as Prisma.InputJsonValue | undefined,
      certificationsJson: input.certificationsJson as Prisma.InputJsonValue | undefined
    },
    select: profileSelect
  });
}

export async function deleteCandidateProfile(userId: string, profileId: string) {
  await getCandidateProfile(userId, profileId);

  await prisma.candidateProfile.delete({
    where: { id: profileId }
  });
}
