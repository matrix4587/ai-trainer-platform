import { describe, it, expect, vi, beforeEach } from "vitest";

import { prisma } from "@/lib/prisma";
import { listPublishedAssessments } from "@/server/services/assessment.service";

describe("listPublishedAssessments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries only PUBLISHED assessments", async () => {
    // arrange
    const findMany = vi.mocked(prisma.assessment.findMany);
    findMany.mockResolvedValueOnce([]);

    // act
    await listPublishedAssessments();

    // assert
    expect(findMany).toHaveBeenCalledTimes(1);
    const callArg = findMany.mock.calls[0][0];
    expect(callArg).toBeDefined();
    expect(callArg?.where).toEqual({ status: "PUBLISHED" });
  });

  it("maps the DB rows into PublicAssessmentSummary shape", async () => {
    // arrange
    const findMany = vi.mocked(prisma.assessment.findMany);
    findMany.mockResolvedValueOnce([
      {
        id: "a1",
        name: "General Reasoning",
        slug: "general-reasoning",
        description: "Basic reasoning tasks",
        category: "reasoning",
        difficulty: "INTERMEDIATE",
        timeLimitMinutes: 30,
        passingScore: 80,
        maxAttempts: 1,
        _count: { questions: 12 },
      },
    ] as never);

    // act
    const result = await listPublishedAssessments();

    // assert
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "a1",
      name: "General Reasoning",
      slug: "general-reasoning",
      description: "Basic reasoning tasks",
      category: "reasoning",
      difficulty: "INTERMEDIATE",
      timeLimitMinutes: 30,
      passingScore: 80,
      maxAttempts: 1,
      questionCount: 12,
    });
  });
});