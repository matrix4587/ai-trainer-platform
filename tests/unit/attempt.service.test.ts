import { describe, it, expect, vi, beforeEach } from "vitest";

import { prisma } from "@/lib/prisma";
import { startAttempt, saveAnswer } from "@/server/services/attempt.service";

describe("startAttempt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns NOT_FOUND when assessment is not published", async () => {
    vi.mocked(prisma.assessment.findFirst).mockResolvedValueOnce(null);

    const result = await startAttempt("draft-thing", "u1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("NOT_FOUND");
  });

  it("returns ATTEMPTS_EXHAUSTED when cap is reached", async () => {
    vi.mocked(prisma.assessment.findFirst).mockResolvedValueOnce({
      id: "a1",
      timeLimitMinutes: 30,
      maxAttempts: 1,
    } as never);

    vi.mocked(prisma.assessmentAttempt.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.assessmentAttempt.count).mockResolvedValueOnce(1);

    const result = await startAttempt("general-reasoning", "u1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("ATTEMPTS_EXHAUSTED");
  });
});

describe("saveAnswer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ATTEMPT_NOT_FOUND when attempt does not belong to user", async () => {
    vi.mocked(prisma.assessmentAttempt.findFirst).mockResolvedValueOnce(null);

    const result = await saveAnswer("att1", "u1", "q1", { optionId: "o1" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("ATTEMPT_NOT_FOUND");
  });

  it("rejects when attempt is no longer IN_PROGRESS", async () => {
    vi.mocked(prisma.assessmentAttempt.findFirst).mockResolvedValueOnce({
      id: "att1",
      status: "SUBMITTED",
      assessmentId: "a1",
      expiresAt: null,
    } as never);

    const result = await saveAnswer("att1", "u1", "q1", { optionId: "o1" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("ATTEMPT_NOT_EDITABLE");
  });

  it("rejects when question is not in this assessment", async () => {
    vi.mocked(prisma.assessmentAttempt.findFirst).mockResolvedValueOnce({
      id: "att1",
      status: "IN_PROGRESS",
      assessmentId: "a1",
      expiresAt: null,
    } as never);
    vi.mocked(prisma.question.findFirst).mockResolvedValueOnce(null);

    const result = await saveAnswer("att1", "u1", "q999", { optionId: "o1" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("QUESTION_NOT_IN_ASSESSMENT");
  });

  it("upserts the answer when everything checks out", async () => {
    vi.mocked(prisma.assessmentAttempt.findFirst).mockResolvedValueOnce({
      id: "att1",
      status: "IN_PROGRESS",
      assessmentId: "a1",
      expiresAt: null,
    } as never);
    vi.mocked(prisma.question.findFirst).mockResolvedValueOnce({ id: "q1" } as never);
    vi.mocked(prisma.assessmentAnswer.upsert).mockResolvedValueOnce({} as never);

    const result = await saveAnswer("att1", "u1", "q1", { optionId: "o1" });

    expect(result.ok).toBe(true);
    expect(prisma.assessmentAnswer.upsert).toHaveBeenCalledTimes(1);
  });
});