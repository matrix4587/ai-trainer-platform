import { describe, it, expect, vi, beforeEach } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  listPublishedAssessments,
  listAssessmentsForUser,
  getAssessmentAttemptsForUser,
} from "@/server/services/assessment.service";

describe("listPublishedAssessments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries only PUBLISHED assessments", async () => {
    const findMany = vi.mocked(prisma.assessment.findMany);
    findMany.mockResolvedValueOnce([]);

    await listPublishedAssessments();

    expect(findMany).toHaveBeenCalledTimes(1);
    const callArg = findMany.mock.calls[0][0];
    expect(callArg).toBeDefined();
    expect(callArg?.where).toEqual({ status: "PUBLISHED" });
  });

  it("maps the DB rows into PublicAssessmentSummary shape", async () => {
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

    const result = await listPublishedAssessments();

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

describe("listAssessmentsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty list when there are no published assessments", async () => {
    vi.mocked(prisma.assessment.findMany).mockResolvedValueOnce([] as never);

    const result = await listAssessmentsForUser("u1");

    expect(result).toEqual([]);
    expect(prisma.assessmentAttempt.findMany).not.toHaveBeenCalled();
  });

  it("attaches attemptsUsed, attemptsRemaining, and last attempt info per assessment", async () => {
    vi.mocked(prisma.assessment.findMany).mockResolvedValueOnce([
      {
        id: "a1",
        name: "General Reasoning",
        slug: "general-reasoning",
        description: null,
        category: "reasoning",
        difficulty: "INTERMEDIATE",
        timeLimitMinutes: 30,
        passingScore: 80,
        maxAttempts: 2,
        _count: { questions: 5 },
      },
      {
        id: "a2",
        name: "Math Basics",
        slug: "math-basics",
        description: null,
        category: "math",
        difficulty: "BEGINNER",
        timeLimitMinutes: 20,
        passingScore: 70,
        maxAttempts: 1,
        _count: { questions: 8 },
      },
    ] as never);

    vi.mocked(prisma.assessmentAttempt.findMany).mockResolvedValueOnce([
      {
        id: "att-new",
        assessmentId: "a1",
        status: "GRADED",
        score: 92,
        startedAt: new Date("2026-10-03T10:00:00Z"),
      },
      {
        id: "att-old",
        assessmentId: "a1",
        status: "GRADED",
        score: 60,
        startedAt: new Date("2026-10-01T10:00:00Z"),
      },
    ] as never);

    const result = await listAssessmentsForUser("u1");

    expect(result).toHaveLength(2);

    const a1 = result.find((r) => r.id === "a1")!;
    expect(a1.attemptsUsed).toBe(2);
    expect(a1.attemptsRemaining).toBe(0);
    expect(a1.lastAttemptStatus).toBe("GRADED");
    expect(a1.lastAttemptScore).toBe(92);
    expect(a1.lastAttemptAt).toBe("2026-10-03T10:00:00.000Z");

    const a2 = result.find((r) => r.id === "a2")!;
    expect(a2.attemptsUsed).toBe(0);
    expect(a2.attemptsRemaining).toBe(1);
    expect(a2.lastAttemptStatus).toBeNull();
    expect(a2.lastAttemptScore).toBeNull();
    expect(a2.lastAttemptAt).toBeNull();
  });

  it("scopes the attempts query to the given user and to non-ABANDONED attempts", async () => {
    vi.mocked(prisma.assessment.findMany).mockResolvedValueOnce([
      {
        id: "a1",
        name: "X",
        slug: "x",
        description: null,
        category: "c",
        difficulty: "BEGINNER",
        timeLimitMinutes: 10,
        passingScore: 50,
        maxAttempts: 1,
        _count: { questions: 1 },
      },
    ] as never);

    vi.mocked(prisma.assessmentAttempt.findMany).mockResolvedValueOnce(
      [] as never,
    );

    await listAssessmentsForUser("u1");

    const callArg = vi.mocked(prisma.assessmentAttempt.findMany).mock
      .calls[0][0];
    expect(callArg?.where).toEqual({
      userId: "u1",
      assessmentId: { in: ["a1"] },
      status: { not: "ABANDONED" },
    });
  });
});

describe("getAssessmentAttemptsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty array when the assessment does not exist", async () => {
    vi.mocked(prisma.assessment.findFirst).mockResolvedValueOnce(null);

    const result = await getAssessmentAttemptsForUser("missing", "u1");

    expect(result).toEqual([]);
    expect(prisma.assessmentAttempt.findMany).not.toHaveBeenCalled();
  });

  it("returns attempts newest first with ISO dates", async () => {
    vi.mocked(prisma.assessment.findFirst).mockResolvedValueOnce({
      id: "a1",
    } as never);

    vi.mocked(prisma.assessmentAttempt.findMany).mockResolvedValueOnce([
      {
        id: "att2",
        status: "GRADED",
        score: 92,
        startedAt: new Date("2026-10-03T10:00:00Z"),
        submittedAt: new Date("2026-10-03T10:15:00Z"),
        gradedAt: new Date("2026-10-03T10:15:01Z"),
      },
      {
        id: "att1",
        status: "GRADED",
        score: 60,
        startedAt: new Date("2026-10-01T10:00:00Z"),
        submittedAt: new Date("2026-10-01T10:15:00Z"),
        gradedAt: new Date("2026-10-01T10:15:01Z"),
      },
    ] as never);

    const result = await getAssessmentAttemptsForUser(
      "general-reasoning",
      "u1",
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "att2",
      status: "GRADED",
      score: 92,
      startedAt: "2026-10-03T10:00:00.000Z",
      submittedAt: "2026-10-03T10:15:00.000Z",
      gradedAt: "2026-10-03T10:15:01.000Z",
    });

    const callArg = vi.mocked(prisma.assessmentAttempt.findMany).mock
      .calls[0][0];
    expect(callArg?.where).toEqual({
      assessmentId: "a1",
      userId: "u1",
    });
    expect(callArg?.orderBy).toEqual({ startedAt: "desc" });
  });
});