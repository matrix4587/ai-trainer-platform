import { prisma } from "@/lib/prisma";
import {
  creditWallet,
  computePaymentCents,
} from "@/server/services/wallet.service";
import { createNotification } from "@/server/services/notification.service";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type PendingReviewItem = {
  submissionId: string;
  taskId: string;
  taskTitle: string;
  taskDifficulty: string;
  projectId: string;
  projectName: string;
  workerId: string;
  workerName: string | null;
  workerEmail: string;
  submittedAt: string;
  qualityScore: number | null;
  response: unknown;
  confidence: number | null;
  comment: string | null;
  estimatedMinutes: number | null;
  ratePerHourCents: number | null;
  qualityThreshold: number;
  projectedPaymentCents: number;
};

export type ListPendingReviewsResult = {
  ok: true;
  items: PendingReviewItem[];
};

export type ApproveResult =
  | {
      ok: true;
      paymentCents: number;
      transactionId: string | null;
      reviewId: string;
    }
  | {
      ok: false;
      reason:
        | "SUBMISSION_NOT_FOUND"
        | "ALREADY_REVIEWED"
        | "PAYMENT_FAILED";
    };

export type RejectResult =
  | { ok: true; reviewId: string }
  | { ok: false; reason: "SUBMISSION_NOT_FOUND" | "ALREADY_REVIEWED" };

// ─────────────────────────────────────────────────────────────
// listPendingReviews
//
// All submissions that are SUBMITTED (i.e. worker has delivered
// but no admin has reviewed yet), newest first.
// ─────────────────────────────────────────────────────────────

export async function listPendingReviews(): Promise<ListPendingReviewsResult> {
  const submissions = await prisma.taskSubmission.findMany({
    where: {
      assignment: { status: "SUBMITTED" },
    },
    orderBy: { submittedAt: "desc" },
    take: 100,
    select: {
      id: true,
      taskId: true,
      userId: true,
      submittedAt: true,
      qualityScore: true,
      response: true,
      confidence: true,
      comment: true,
      user: {
        select: { id: true, name: true, email: true },
      },
      task: {
        select: {
          id: true,
          title: true,
          difficulty: true,
          estimatedMinutes: true,
          ratePerHourCents: true,
          project: {
            select: {
              id: true,
              name: true,
              qualityThreshold: true,
            },
          },
        },
      },
    },
  });

  const items: PendingReviewItem[] = submissions.map((s) => {
    const projected = computePaymentCents({
      ratePerHourCents: s.task.ratePerHourCents,
      estimatedMinutes: s.task.estimatedMinutes,
      qualityScore: s.qualityScore,
      qualityThreshold: s.task.project.qualityThreshold,
    });

    return {
      submissionId: s.id,
      taskId: s.taskId,
      taskTitle: s.task.title,
      taskDifficulty: s.task.difficulty,
      projectId: s.task.project.id,
      projectName: s.task.project.name,
      workerId: s.user.id,
      workerName: s.user.name,
      workerEmail: s.user.email,
      submittedAt: s.submittedAt.toISOString(),
      qualityScore: s.qualityScore,
      response: s.response,
      confidence: s.confidence,
      comment: s.comment,
      estimatedMinutes: s.task.estimatedMinutes,
      ratePerHourCents: s.task.ratePerHourCents,
      qualityThreshold: s.task.project.qualityThreshold,
      projectedPaymentCents: projected,
    };
  });

  return { ok: true, items };
}

// ─────────────────────────────────────────────────────────────
// approveSubmission
//
// Called by an ADMIN. Effects:
//   1. Write a TaskReview row (APPROVED)
//   2. Flip the assignment to COMPLETED
//   3. Credit the worker's wallet (if the submission passed
//      the project's quality threshold)
//   4. Notify the worker
//
// If the submission already has a non-PENDING review, we bail
// with ALREADY_REVIEWED to prevent double payments.
// ─────────────────────────────────────────────────────────────

export async function approveSubmission(
  submissionId: string,
  reviewerId: string,
  comment?: string | null,
): Promise<ApproveResult> {
  const submission = await prisma.taskSubmission.findFirst({
    where: { id: submissionId },
    select: {
      id: true,
      taskId: true,
      userId: true,
      qualityScore: true,
      assignmentId: true,
      task: {
        select: {
          id: true,
          title: true,
          estimatedMinutes: true,
          ratePerHourCents: true,
          project: {
            select: { name: true, qualityThreshold: true },
          },
        },
      },
    },
  });

  if (!submission) return { ok: false, reason: "SUBMISSION_NOT_FOUND" };

  const existingReview = await prisma.taskReview.findFirst({
    where: { submissionId, status: { not: "PENDING" } },
    select: { id: true },
  });

  if (existingReview) {
    return { ok: false, reason: "ALREADY_REVIEWED" };
  }

  const paymentCents = computePaymentCents({
    ratePerHourCents: submission.task.ratePerHourCents,
    estimatedMinutes: submission.task.estimatedMinutes,
    qualityScore: submission.qualityScore,
    qualityThreshold: submission.task.project.qualityThreshold,
  });

  const review = await prisma.taskReview.create({
    data: {
      submissionId,
      taskId: submission.taskId,
      reviewerId,
      type: "ADMIN",
      status: "APPROVED",
      score: submission.qualityScore,
      comment: comment ?? null,
      reviewedAt: new Date(),
    },
    select: { id: true },
  });

  if (submission.assignmentId) {
    await prisma.taskAssignment.update({
      where: { id: submission.assignmentId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }

  let transactionId: string | null = null;

  if (paymentCents > 0) {
    const credited = await creditWallet({
      userId: submission.userId,
      amountCents: paymentCents,
      type: "TASK_EARNING",
      description: `Earned: ${submission.task.title}`,
      reference: `sub_${submission.id}`,
      taskId: submission.taskId,
      submissionId: submission.id,
      createdById: reviewerId,
    });

    if (!credited.ok) {
      // The review row exists but payment failed. Surface it so
      // the admin UI can show a warning.
      return { ok: false, reason: "PAYMENT_FAILED" };
    }

    transactionId = credited.transactionId;
  }

  await createNotification({
    userId: submission.userId,
    type: "TASK_APPROVED",
    title:
      paymentCents > 0
        ? "Task approved — you earned money"
        : "Task approved",
    body:
      paymentCents > 0
        ? `${submission.task.title} — $${(paymentCents / 100).toFixed(2)} added to your wallet.`
        : `${submission.task.title} was approved, but it did not meet the quality threshold (${submission.task.project.qualityThreshold}).`,
    link: "/wallet",
    metadata: {
      submissionId: submission.id,
      taskId: submission.taskId,
      paymentCents,
    },
  });

  return {
    ok: true,
    paymentCents,
    transactionId,
    reviewId: review.id,
  };
}

// ─────────────────────────────────────────────────────────────
// rejectSubmission
//
// Called by an ADMIN. Effects:
//   1. Write a TaskReview row (REJECTED)
//   2. Flip the assignment back to ACCEPTED so the worker can
//      retry (their submission is kept for audit)
//   3. Notify the worker
// No payment is made.
// ─────────────────────────────────────────────────────────────

export async function rejectSubmission(
  submissionId: string,
  reviewerId: string,
  comment?: string | null,
): Promise<RejectResult> {
  const submission = await prisma.taskSubmission.findFirst({
    where: { id: submissionId },
    select: {
      id: true,
      taskId: true,
      userId: true,
      qualityScore: true,
      assignmentId: true,
      task: { select: { title: true } },
    },
  });

  if (!submission) return { ok: false, reason: "SUBMISSION_NOT_FOUND" };

  const existingReview = await prisma.taskReview.findFirst({
    where: { submissionId, status: { not: "PENDING" } },
    select: { id: true },
  });

  if (existingReview) {
    return { ok: false, reason: "ALREADY_REVIEWED" };
  }

  const review = await prisma.taskReview.create({
    data: {
      submissionId,
      taskId: submission.taskId,
      reviewerId,
      type: "ADMIN",
      status: "REJECTED",
      score: submission.qualityScore,
      comment: comment ?? null,
      reviewedAt: new Date(),
    },
    select: { id: true },
  });

  if (submission.assignmentId) {
    await prisma.taskAssignment.update({
      where: { id: submission.assignmentId },
      data: { status: "ACCEPTED", submittedAt: null },
    });
  }

  await createNotification({
    userId: submission.userId,
    type: "TASK_REJECTED",
    title: "Task needs another pass",
    body: comment
      ? `${submission.task.title}: ${comment}`
      : `${submission.task.title} was not approved. You can try again.`,
    link: "/tasks",
    metadata: {
      submissionId: submission.id,
      taskId: submission.taskId,
    },
  });

  return { ok: true, reviewId: review.id };
}