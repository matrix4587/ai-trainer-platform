import { describe, it, expect, vi, beforeEach } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  approveSubmission,
  listPendingReviews,
  rejectSubmission,
} from "@/server/services/review.service";

const baseSubmission = {
  id: "s1",
  taskId: "t1",
  userId: "u1",
  qualityScore: 95,
  assignmentId: "as1",
  task: {
    id: "t1",
    title: "Classify a customer review",
    estimatedMinutes: 10,
    ratePerHourCents: 600,
    project: {
      name: "Sentiment",
      qualityThreshold: 85,
    },
  },
};

describe("listPendingReviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries SUBMITTED assignments and maps to the view shape", async () => {
    vi.mocked(prisma.taskSubmission.findMany).mockResolvedValueOnce([
      {
        id: "s1",
        taskId: "t1",
        userId: "u1",
        submittedAt: new Date("2026-10-04T12:00:00Z"),
        qualityScore: 95,
        response: { text: "Positive" },
        confidence: 0.9,
        comment: null,
        user: { id: "u1", name: "Dennis", email: "d@example.com" },
        task: {
          id: "t1",
          title: "Classify a customer review",
          difficulty: "INTERMEDIATE",
          estimatedMinutes: 10,
          ratePerHourCents: 600,
          project: {
            id: "p1",
            name: "Sentiment",
            qualityThreshold: 85,
          },
        },
      },
    ] as never);

    const result = await listPendingReviews();

    expect(result.items).toHaveLength(1);
    expect(result.items[0].submissionId).toBe("s1");
    expect(result.items[0].projectedPaymentCents).toBe(100);
    expect(result.items[0].workerEmail).toBe("d@example.com");
  });
});

describe("approveSubmission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns SUBMISSION_NOT_FOUND when the submission doesn't exist", async () => {
    vi.mocked(prisma.taskSubmission.findFirst).mockResolvedValueOnce(null);

    const result = await approveSubmission("s-missing", "reviewer1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("SUBMISSION_NOT_FOUND");
  });

  it("returns ALREADY_REVIEWED when a review exists", async () => {
    vi.mocked(prisma.taskSubmission.findFirst).mockResolvedValueOnce(
      baseSubmission as never,
    );
    vi.mocked(prisma.taskReview.findFirst).mockResolvedValueOnce({
      id: "rv-old",
    } as never);

    const result = await approveSubmission("s1", "reviewer1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("ALREADY_REVIEWED");
  });

  it("writes a review, completes the assignment, and credits the wallet", async () => {
    vi.mocked(prisma.taskSubmission.findFirst).mockResolvedValueOnce(
      baseSubmission as never,
    );
    vi.mocked(prisma.taskReview.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.taskReview.create).mockResolvedValueOnce({
      id: "rv1",
    } as never);
    vi.mocked(prisma.taskAssignment.update).mockResolvedValueOnce({} as never);

    // creditWallet internals
    vi.mocked(prisma.wallet.findUnique).mockResolvedValueOnce({
      id: "w1",
      currency: "USD",
    } as never);
    vi.mocked(prisma.transaction.create).mockResolvedValueOnce({
      id: "tx1",
    } as never);
    vi.mocked(prisma.wallet.update).mockResolvedValueOnce({
      balanceCents: 100,
    } as never);

    // notification
    vi.mocked(prisma.notification.create).mockResolvedValueOnce({} as never);

    const result = await approveSubmission("s1", "reviewer1", "Looks good");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.paymentCents).toBe(100);
      expect(result.transactionId).toBe("tx1");
      expect(result.reviewId).toBe("rv1");
    }

    const reviewArg = vi.mocked(prisma.taskReview.create).mock.calls[0][0];
    expect(reviewArg?.data).toMatchObject({
      submissionId: "s1",
      reviewerId: "reviewer1",
      status: "APPROVED",
    });
  });

  it("pays nothing when quality is below the threshold, but still approves", async () => {
    vi.mocked(prisma.taskSubmission.findFirst).mockResolvedValueOnce({
      ...baseSubmission,
      qualityScore: 60,
    } as never);
    vi.mocked(prisma.taskReview.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.taskReview.create).mockResolvedValueOnce({
      id: "rv1",
    } as never);
    vi.mocked(prisma.taskAssignment.update).mockResolvedValueOnce({} as never);
    vi.mocked(prisma.notification.create).mockResolvedValueOnce({} as never);

    const result = await approveSubmission("s1", "reviewer1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.paymentCents).toBe(0);
      expect(result.transactionId).toBeNull();
    }

    // Should NOT have written a transaction for a rejected-by-quality approve
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });
});

describe("rejectSubmission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns SUBMISSION_NOT_FOUND when missing", async () => {
    vi.mocked(prisma.taskSubmission.findFirst).mockResolvedValueOnce(null);

    const result = await rejectSubmission("s-missing", "reviewer1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("SUBMISSION_NOT_FOUND");
  });

  it("writes a REJECTED review, reopens the assignment, and notifies the worker", async () => {
    vi.mocked(prisma.taskSubmission.findFirst).mockResolvedValueOnce(
      baseSubmission as never,
    );
    vi.mocked(prisma.taskReview.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.taskReview.create).mockResolvedValueOnce({
      id: "rv1",
    } as never);
    vi.mocked(prisma.taskAssignment.update).mockResolvedValueOnce({} as never);
    vi.mocked(prisma.notification.create).mockResolvedValueOnce({} as never);

    const result = await rejectSubmission("s1", "reviewer1", "Needs more detail");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.reviewId).toBe("rv1");

    const reviewArg = vi.mocked(prisma.taskReview.create).mock.calls[0][0];
    expect(reviewArg?.data).toMatchObject({
      submissionId: "s1",
      reviewerId: "reviewer1",
      status: "REJECTED",
      comment: "Needs more detail",
    });

    const assignArg = vi.mocked(prisma.taskAssignment.update).mock.calls[0][0];
    expect(assignArg?.data).toMatchObject({ status: "ACCEPTED" });

    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });
});