import { JobStatus } from "@prisma/client";
import { prisma } from "../utils/prisma";

const activeResponseStatuses = [
  JobStatus.RECRUITER_REACHED_OUT,
  JobStatus.INTERVIEW,
  JobStatus.ASSESSMENT,
  JobStatus.OFFER,
  JobStatus.REJECTED
];

const summaryStatuses = [
  JobStatus.APPLIED,
  JobStatus.RECRUITER_REACHED_OUT,
  JobStatus.INTERVIEW,
  JobStatus.ASSESSMENT,
  JobStatus.REJECTED,
  JobStatus.OFFER,
  JobStatus.GHOSTED,
  JobStatus.WITHDRAWN
];

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function dayKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function percent(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 1000) / 10;
}

export async function getDashboardSummary(userId: string) {
  const now = new Date();
  const today = startOfDay(now);
  const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
  const fourWeeksAgo = new Date(today.getTime() - 27 * 24 * 60 * 60 * 1000);
  const [
    totalJobsSaved,
    totalResumesGenerated,
    applicationStatusCounts,
    averageMatchScore,
    followUpsDue,
    upcomingNotifications,
    recentApplications
  ] = await Promise.all([
    prisma.job.count({ where: { userId } }),
    prisma.resumeVersion.count({ where: { userId } }),
    prisma.application.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true }
    }),
    prisma.resumeVersion.aggregate({
      where: {
        userId,
        matchScore: { not: null }
      },
      _avg: { matchScore: true }
    }),
    prisma.notification.count({
      where: {
        userId,
        read: false,
        type: "FOLLOW_UP",
        dueAt: { lte: endOfToday }
      }
    }),
    prisma.notification.findMany({
      where: {
        userId,
        read: false,
        dueAt: {
          gte: today,
          lte: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
        }
      },
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        read: true,
        dueAt: true,
        application: {
          select: {
            id: true,
            job: {
              select: {
                id: true,
                companyName: true,
                jobTitle: true
              }
            }
          }
        }
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 6
    }),
    prisma.application.findMany({
      where: {
        userId,
        appliedDate: { gte: fourWeeksAgo }
      },
      select: {
        appliedDate: true
      }
    })
  ]);
  const countByStatus = Object.fromEntries(
    applicationStatusCounts.map((entry) => [entry.status, entry._count._all])
  ) as Partial<Record<JobStatus, number>>;
  const applicationsSubmitted = summaryStatuses.reduce((total, status) => total + (countByStatus[status] ?? 0), 0);
  const interviewsScheduled = countByStatus.INTERVIEW ?? 0;
  const assessments = countByStatus.ASSESSMENT ?? 0;
  const rejections = countByStatus.REJECTED ?? 0;
  const offers = countByStatus.OFFER ?? 0;
  const ghostedApplications = countByStatus.GHOSTED ?? 0;
  const responses = activeResponseStatuses.reduce((total, status) => total + (countByStatus[status] ?? 0), 0);
  const dailyApplications = Array.from({ length: 28 }, (_, index) => {
    const date = new Date(fourWeeksAgo.getTime() + index * 24 * 60 * 60 * 1000);
    const key = dayKey(date);
    return {
      date: key,
      applications: recentApplications.filter((application) => application.appliedDate && dayKey(application.appliedDate) === key).length
    };
  });
  const statusDistribution = summaryStatuses.map((status) => ({
    status,
    count: countByStatus[status] ?? 0
  }));

  return {
    metrics: {
      totalJobsSaved,
      totalResumesGenerated,
      applicationsSubmitted,
      interviewsScheduled,
      assessments,
      rejections,
      offers,
      ghostedApplications,
      averageMatchScore: Math.round(averageMatchScore._avg.matchScore ?? 0),
      responseRate: percent(responses, applicationsSubmitted),
      interviewRate: percent(interviewsScheduled, applicationsSubmitted),
      followUpsDue
    },
    charts: {
      statusDistribution,
      dailyApplications
    },
    upcomingNotifications
  };
}
