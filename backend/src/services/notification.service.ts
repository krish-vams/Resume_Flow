import type { Application, Job } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { HttpError } from "../utils/http-error";

type ApplicationWithJob = Application & {
  job: Pick<Job, "companyName" | "jobTitle">;
};

const notificationSelect = {
  id: true,
  userId: true,
  applicationId: true,
  title: true,
  message: true,
  type: true,
  read: true,
  dueAt: true,
  application: {
    select: {
      id: true,
      status: true,
      job: {
        select: {
          id: true,
          companyName: true,
          jobTitle: true
        }
      }
    }
  },
  createdAt: true,
  updatedAt: true
};

function reminderDate(value: Date | string | null | undefined) {
  return value ? new Date(value) : null;
}

function notificationMessage(application: ApplicationWithJob, kind: "FOLLOW_UP" | "INTERVIEW" | "ASSESSMENT") {
  if (kind === "FOLLOW_UP") {
    return {
      title: `Follow up with ${application.job.companyName}`,
      message: application.recruiterName
        ? `Follow up with ${application.recruiterName} about the ${application.job.jobTitle} role.`
        : `Follow up about the ${application.job.jobTitle} role at ${application.job.companyName}.`
    };
  }

  if (kind === "INTERVIEW") {
    return {
      title: `Interview with ${application.job.companyName}`,
      message: `Interview for ${application.job.jobTitle} at ${application.job.companyName}.`
    };
  }

  return {
    title: `Assessment deadline for ${application.job.companyName}`,
    message: `Complete the ${application.job.jobTitle} assessment for ${application.job.companyName}.`
  };
}

async function upsertApplicationNotification(
  application: ApplicationWithJob,
  type: "FOLLOW_UP" | "INTERVIEW" | "ASSESSMENT",
  dueAt: Date | null
) {
  if (!dueAt) {
    await prisma.notification.deleteMany({
      where: {
        applicationId: application.id,
        type
      }
    });
    return;
  }

  const content = notificationMessage(application, type);
  const existing = await prisma.notification.findFirst({
    where: {
      applicationId: application.id,
      type
    }
  });

  if (existing) {
    await prisma.notification.update({
      where: { id: existing.id },
      data: {
        ...content,
        dueAt,
        read: false
      }
    });
    return;
  }

  await prisma.notification.create({
    data: {
      userId: application.userId,
      applicationId: application.id,
      type,
      dueAt,
      ...content
    }
  });
}

export async function syncApplicationNotifications(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      job: {
        select: {
          companyName: true,
          jobTitle: true
        }
      }
    }
  });

  if (!application) {
    return;
  }

  await Promise.all([
    upsertApplicationNotification(application, "FOLLOW_UP", reminderDate(application.followUpDate)),
    upsertApplicationNotification(application, "INTERVIEW", reminderDate(application.interviewDate)),
    upsertApplicationNotification(application, "ASSESSMENT", reminderDate(application.assessmentDueDate))
  ]);
}

export async function listNotifications(userId: string, input: { unreadOnly?: boolean; upcomingOnly?: boolean; limit?: number }) {
  const now = new Date();
  const futureWindow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return prisma.notification.findMany({
    where: {
      userId,
      ...(input.unreadOnly ? { read: false } : {}),
      ...(input.upcomingOnly ? { dueAt: { gte: now, lte: futureWindow } } : {})
    },
    select: notificationSelect,
    orderBy: [{ read: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: input.limit ?? 20
  });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId
    },
    select: {
      id: true
    }
  });

  if (!notification) {
    throw new HttpError(404, "Notification not found");
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
    select: notificationSelect
  });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: {
      userId,
      read: false
    },
    data: { read: true }
  });

  return listNotifications(userId, { limit: 20 });
}
