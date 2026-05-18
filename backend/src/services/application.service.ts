import type { JobStatus } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { HttpError } from "../utils/http-error";
import { syncApplicationNotifications } from "./notification.service";

type ApplicationInput = {
  jobId?: string;
  resumeVersionId?: string | null;
  status?: JobStatus;
  appliedDate?: string | null;
  followUpDate?: string | null;
  recruiterName?: string | null;
  recruiterEmail?: string | null;
  interviewDate?: string | null;
  assessmentDueDate?: string | null;
  notes?: string | null;
};

const applicationSelect = {
  id: true,
  userId: true,
  jobId: true,
  resumeVersionId: true,
  status: true,
  appliedDate: true,
  followUpDate: true,
  recruiterName: true,
  recruiterEmail: true,
  interviewDate: true,
  assessmentDueDate: true,
  notes: true,
  job: {
    select: {
      id: true,
      companyName: true,
      jobTitle: true,
      jobUrl: true,
      status: true
    }
  },
  resumeVersion: {
    select: {
      id: true,
      resumeName: true,
      version: true,
      formattedDocxUrl: true,
      validationStatus: true
    }
  },
  createdAt: true,
  updatedAt: true
};

function toDate(value?: string | null) {
  return value ? new Date(value) : null;
}

async function assertUserOwnedReferences(userId: string, input: ApplicationInput) {
  if (input.jobId) {
    const job = await prisma.job.findFirst({
      where: {
        id: input.jobId,
        userId
      },
      select: { id: true }
    });

    if (!job) {
      throw new HttpError(404, "Job not found");
    }
  }

  if (input.resumeVersionId) {
    const resume = await prisma.resumeVersion.findFirst({
      where: {
        id: input.resumeVersionId,
        userId
      },
      select: {
        id: true,
        jobId: true
      }
    });

    if (!resume) {
      throw new HttpError(404, "Resume version not found");
    }

    if (input.jobId && resume.jobId !== input.jobId) {
      throw new HttpError(400, "Resume version must belong to the selected job");
    }
  }
}

function serializeApplicationInput(input: ApplicationInput) {
  return {
    ...(input.jobId !== undefined ? { jobId: input.jobId } : {}),
    ...(input.resumeVersionId !== undefined ? { resumeVersionId: input.resumeVersionId || null } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.appliedDate !== undefined ? { appliedDate: toDate(input.appliedDate) } : {}),
    ...(input.followUpDate !== undefined ? { followUpDate: toDate(input.followUpDate) } : {}),
    ...(input.recruiterName !== undefined ? { recruiterName: input.recruiterName || null } : {}),
    ...(input.recruiterEmail !== undefined ? { recruiterEmail: input.recruiterEmail || null } : {}),
    ...(input.interviewDate !== undefined ? { interviewDate: toDate(input.interviewDate) } : {}),
    ...(input.assessmentDueDate !== undefined ? { assessmentDueDate: toDate(input.assessmentDueDate) } : {}),
    ...(input.notes !== undefined ? { notes: input.notes || null } : {})
  };
}

export async function createApplication(userId: string, input: Required<Pick<ApplicationInput, "jobId">> & ApplicationInput) {
  await assertUserOwnedReferences(userId, input);

  const application = await prisma.application.create({
    data: {
      userId,
      jobId: input.jobId,
      resumeVersionId: input.resumeVersionId,
      status: input.status,
      appliedDate: toDate(input.appliedDate),
      followUpDate: toDate(input.followUpDate),
      recruiterName: input.recruiterName,
      recruiterEmail: input.recruiterEmail,
      interviewDate: toDate(input.interviewDate),
      assessmentDueDate: toDate(input.assessmentDueDate),
      notes: input.notes
    },
    select: applicationSelect
  });

  if (input.status) {
    await prisma.job.update({
      where: { id: input.jobId },
      data: { status: input.status }
    });
  }

  await syncApplicationNotifications(application.id);

  return application;
}

export async function listApplications(userId: string) {
  return prisma.application.findMany({
    where: { userId },
    select: applicationSelect,
    orderBy: [{ followUpDate: "asc" }, { createdAt: "desc" }]
  });
}

export async function getApplication(userId: string, applicationId: string) {
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      userId
    },
    select: applicationSelect
  });

  if (!application) {
    throw new HttpError(404, "Application not found");
  }

  return application;
}

export async function updateApplication(userId: string, applicationId: string, input: ApplicationInput) {
  const existingApplication = await getApplication(userId, applicationId);
  const referenceInput = {
    ...input,
    jobId: input.jobId ?? existingApplication.jobId
  };
  await assertUserOwnedReferences(userId, referenceInput);

  const application = await prisma.application.update({
    where: { id: applicationId },
    data: serializeApplicationInput(input),
    select: applicationSelect
  });

  if (input.status) {
    await prisma.job.update({
      where: { id: application.jobId },
      data: { status: input.status }
    });
  }

  await syncApplicationNotifications(application.id);

  return application;
}

export async function deleteApplication(userId: string, applicationId: string) {
  await getApplication(userId, applicationId);

  await prisma.application.delete({
    where: { id: applicationId }
  });
}
