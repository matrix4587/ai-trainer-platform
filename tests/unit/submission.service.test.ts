import { describe, it, expect, vi, beforeEach } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  computeQualityScore,
  submitTask,
} from "@/server/services/submission.service";

describe("computeQualityScore", () => {
  it("returns baseline 70 when no goldAnswer and no confidence", () => {
    const { score, isCorrect } = computeQualityScore({
      response: { text: "hello" },
      goldAnswer: null,
      confidence: null,
    });
    expect(score).toBe(70);
    expect(isCorrect).toBeNull();
  });

  it("returns 100 when response deep-equals goldAnswer", () => {
    const { score, isCorrect } = computeQualityScore({
      response: { optionId: "o1" },
      goldAnswer: { optionId: "o1" },
      confidence: null,
    });
    expect(score).toBe(100);
    expect(isCorrect).toBe(true);
  });

  it("returns 0 when response differs from goldAnswer", () => {
    const { score, isCorrect } = computeQualityScore({
      response: { optionId: "o2" },
      goldAnswer: { optionId: "o1" },
      confidence: null,
    });
    expect(score).toBe(0);
    expect(isCorrect).toBe(false);
  });

  it("handles nested objects in deepEqual", () => {
    const { score } = computeQualityScore({
      response: { a: { b: [1, 2, 3] } },
      goldAnswer: { a: { b: [1, 2, 3] } },
      confidence: null,
    });
    expect(score).toBe(100);
  });

  it("distinguishes array order", () => {
    const { score } = computeQualityScore({
      response: { a: [1, 2, 3] },
      goldAnswer: { a: [3, 2, 1] },
      confidence: null,
    });
    expect(score).toBe(0);
  });

  it("nudges up with high confidence on a correct answer", () => {
    const { score } = computeQualityScore({
      response: { x: 1 },
      goldAnswer: { x: 1 },
      confidence: 1.0,
    });
    expect(score).toBe(100);
  });

  it("nudges down with low confidence on a correct answer", () => {
    const { score } = computeQualityScore({
      response: { x: 1 },
      goldAnswer: { x: 1 },
      confidence: 0.0,
    });
    expect(score).toBe(95);
  });

  it("clamps the final score to [0, 100]", () => {
    const { score } = computeQualityScore({
      response: { x: 1 },
      goldAnswer: { x: 2 },
      confidence: 0,
    });
    expect(score).toBe(0);
  });
});

describe("submitTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ASSIGNMENT_NOT_FOUND when the assignment does not exist or belongs to another user", async () => {
    vi.mocked(prisma.taskAssignment.findFirst).mockResolvedValueOnce(null);

    const result = await submitTask("as-missing", "u1", { x: 1 }, null, null);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("ASSIGNMENT_NOT_FOUND");
  });

  it("returns ASSIGNMENT_NOT_ACTIVE when the assignment is already SUBMITTED", async () => {
    vi.mocked(prisma.taskAssignment.findFirst).mockResolvedValueOnce({
      id: "as1",
      taskId: "t1",
      status: "SUBMITTED",
    } as never);

    const result = await submitTask("as1", "u1", { x: 1 }, null, null);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("ASSIGNMENT_NOT_ACTIVE");
  });

  it("returns TASK_NOT_FOUND when the task row is missing", async () => {
    vi.mocked(prisma.taskAssignment.findFirst).mockResolvedValueOnce({
      id: "as1",
      taskId: "t1",
      status: "ACCEPTED",
    } as never);
    vi.mocked(prisma.task.findFirst).mockResolvedValueOnce(null);

    const result = await submitTask("as1", "u1", { x: 1 }, null, null);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("TASK_NOT_FOUND");
  });

  it("creates a submission, updates the assignment, and writes a quality score", async () => {
    vi.mocked(prisma.taskAssignment.findFirst).mockResolvedValueOnce({
      id: "as1",
      taskId: "t1",
      status: "ACCEPTED",
    } as never);
    vi.mocked(prisma.task.findFirst).mockResolvedValueOnce({
      id: "t1",
      goldAnswer: { optionId: "o1" },
    } as never);
    vi.mocked(prisma.taskSubmission.create).mockResolvedValueOnce({
      id: "sub1",
      taskId: "t1",
      assignmentId: "as1",
      submittedAt: new Date("2026-10-04T12:00:00Z"),
      qualityScore: 100,
      isCorrect: true,
    } as never);
    vi.mocked(prisma.taskAssignment.update).mockResolvedValueOnce({} as never);
    vi.mocked(prisma.qualityScore.create).mockResolvedValueOnce({} as never);

    const result = await submitTask("as1", "u1", { optionId: "o1" }, 0.9, "confident");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.submission.id).toBe("sub1");
      expect(result.submission.qualityScore).toBe(100);
      expect(result.submission.isCorrect).toBe(true);
      expect(result.assignmentStatus).toBe("SUBMITTED");
    }
    expect(prisma.taskSubmission.create).toHaveBeenCalledTimes(1);
    expect(prisma.taskAssignment.update).toHaveBeenCalledTimes(1);
    expect(prisma.qualityScore.create).toHaveBeenCalledTimes(1);
  });

  it("creates a submission with baseline score when no goldAnswer exists", async () => {
    vi.mocked(prisma.taskAssignment.findFirst).mockResolvedValueOnce({
      id: "as2",
      taskId: "t2",
      status: "STARTED",
    } as never);
    vi.mocked(prisma.task.findFirst).mockResolvedValueOnce({
      id: "t2",
      goldAnswer: null,
    } as never);
    vi.mocked(prisma.taskSubmission.create).mockResolvedValueOnce({
      id: "sub2",
      taskId: "t2",
      assignmentId: "as2",
      submittedAt: new Date("2026-10-04T12:00:00Z"),
      qualityScore: 70,
      isCorrect: null,
    } as never);
    vi.mocked(prisma.taskAssignment.update).mockResolvedValueOnce({} as never);
    vi.mocked(prisma.qualityScore.create).mockResolvedValueOnce({} as never);

    const result = await submitTask("as2", "u1", { text: "any answer" }, null, null);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.submission.qualityScore).toBe(70);
      expect(result.submission.isCorrect).toBeNull();
    }
  });
});