import { describe, it, expect, vi, beforeEach } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  conditionsMatch,
  evaluateQualificationRules,
  listUserCapabilities,
  type AttemptSummary,
} from "@/server/services/capability.service";

// ─────────────────────────────────────────────────────────────
// Pure rule-matching tests — no Prisma involved
// ─────────────────────────────────────────────────────────────

describe("conditionsMatch", () => {
  const base: AttemptSummary = {
    id: "att1",
    userId: "u1",
    assessmentId: "a1",
    score: 85,
    accuracyScore: 85,
    reasoningScore: 80,
    categoryPerformance: { reasoning: 90, math: 70 },
  };

  it("matches an empty rule (no constraints)", () => {
    expect(conditionsMatch({}, base)).toBe(true);
  });

  it("requires minScore", () => {
    expect(conditionsMatch({ minScore: 80 }, base)).toBe(true);
    expect(conditionsMatch({ minScore: 90 }, base)).toBe(false);
  });

  it("requires maxScore", () => {
    expect(conditionsMatch({ maxScore: 90 }, base)).toBe(true);
    expect(conditionsMatch({ maxScore: 80 }, base)).toBe(false);
  });

  it("supports a score band (min AND max)", () => {
    expect(conditionsMatch({ minScore: 80, maxScore: 89 }, base)).toBe(true);
    expect(conditionsMatch({ minScore: 86, maxScore: 89 }, base)).toBe(false);
  });

  it("requires minReasoning", () => {
    expect(conditionsMatch({ minReasoning: 75 }, base)).toBe(true);
    expect(conditionsMatch({ minReasoning: 85 }, base)).toBe(false);
  });

  it("checks category score when category is set", () => {
    expect(conditionsMatch({ category: "reasoning", minCategoryScore: 80 }, base)).toBe(true);
    expect(conditionsMatch({ category: "reasoning", minCategoryScore: 95 }, base)).toBe(false);
  });

  it("fails when the category is missing from categoryPerformance", () => {
    expect(conditionsMatch({ category: "unknown", minCategoryScore: 1 }, base)).toBe(false);
  });

  it("treats null scores as 0", () => {
    const noScore: AttemptSummary = {
      ...base,
      score: null,
      accuracyScore: null,
      reasoningScore: null,
    };
    expect(conditionsMatch({ minScore: 1 }, noScore)).toBe(false);
    expect(conditionsMatch({ minScore: 0 }, noScore)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// Engine tests — mocked Prisma
// ─────────────────────────────────────────────────────────────

describe("evaluateQualificationRules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ATTEMPT_NOT_FOUND when attempt is missing", async () => {
    vi.mocked(prisma.assessmentAttempt.findFirst).mockResolvedValueOnce(null);

    const result = await evaluateQualificationRules("att1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("ATTEMPT_NOT_FOUND");
  });

  it("returns ATTEMPT_NOT_GRADED when attempt is not graded", async () => {
    vi.mocked(prisma.assessmentAttempt.findFirst).mockResolvedValueOnce({
      id: "att1",
      userId: "u1",
      assessmentId: "a1",
      status: "IN_PROGRESS",
      score: null,
      accuracyScore: null,
      reasoningScore: null,
      categoryPerformance: null,
    } as never);

    const result = await evaluateQualificationRules("att1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("ATTEMPT_NOT_GRADED");
  });

  it("grants a new capability when a rule matches and none exists", async () => {
    vi.mocked(prisma.assessmentAttempt.findFirst).mockResolvedValueOnce({
      id: "att1",
      userId: "u1",
      assessmentId: "a1",
      status: "GRADED",
      score: 85,
      accuracyScore: 85,
      reasoningScore: 80,
      categoryPerformance: null,
    } as never);

    vi.mocked(prisma.qualificationRule.findMany).mockResolvedValueOnce([
      {
        id: "r1",
        capabilityId: "c1",
        conditions: { minScore: 80 },
        targetLevel: "INTERMEDIATE",
      },
    ] as never);

    vi.mocked(prisma.userCapability.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.userCapability.create).mockResolvedValueOnce({} as never);
    vi.mocked(prisma.capabilityHistory.create).mockResolvedValueOnce({} as never);
    vi.mocked(prisma.capability.findFirst).mockResolvedValueOnce({ name: "Reasoning" } as never);

    const result = await evaluateQualificationRules("att1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.grants).toHaveLength(1);
      expect(result.grants[0].action).toBe("created");
      expect(result.grants[0].level).toBe("INTERMEDIATE");
    }
    expect(prisma.userCapability.create).toHaveBeenCalledTimes(1);
    expect(prisma.capabilityHistory.create).toHaveBeenCalledTimes(1);
  });

  it("does not grant when conditions do not match", async () => {
    vi.mocked(prisma.assessmentAttempt.findFirst).mockResolvedValueOnce({
      id: "att1",
      userId: "u1",
      assessmentId: "a1",
      status: "GRADED",
      score: 60,
      accuracyScore: 60,
      reasoningScore: 50,
      categoryPerformance: null,
    } as never);

    vi.mocked(prisma.qualificationRule.findMany).mockResolvedValueOnce([
      {
        id: "r1",
        capabilityId: "c1",
        conditions: { minScore: 80 },
        targetLevel: "INTERMEDIATE",
      },
    ] as never);

    const result = await evaluateQualificationRules("att1");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.grants).toHaveLength(0);
    expect(prisma.userCapability.create).not.toHaveBeenCalled();
    expect(prisma.capabilityHistory.create).not.toHaveBeenCalled();
  });

  it("upgrades an existing capability when new level is higher", async () => {
    vi.mocked(prisma.assessmentAttempt.findFirst).mockResolvedValueOnce({
      id: "att1",
      userId: "u1",
      assessmentId: "a1",
      status: "GRADED",
      score: 95,
      accuracyScore: 95,
      reasoningScore: 90,
      categoryPerformance: null,
    } as never);

    vi.mocked(prisma.qualificationRule.findMany).mockResolvedValueOnce([
      {
        id: "r1",
        capabilityId: "c1",
        conditions: { minScore: 90 },
        targetLevel: "ADVANCED",
      },
    ] as never);

    vi.mocked(prisma.userCapability.findFirst).mockResolvedValueOnce({
      id: "uc1",
      level: "INTERMEDIATE",
      score: 80,
    } as never);
    vi.mocked(prisma.userCapability.update).mockResolvedValueOnce({} as never);
    vi.mocked(prisma.capabilityHistory.create).mockResolvedValueOnce({} as never);
    vi.mocked(prisma.capability.findFirst).mockResolvedValueOnce({ name: "Reasoning" } as never);

    const result = await evaluateQualificationRules("att1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.grants).toHaveLength(1);
      expect(result.grants[0].action).toBe("upgraded");
    }
    expect(prisma.userCapability.update).toHaveBeenCalledTimes(1);
    expect(prisma.capabilityHistory.create).toHaveBeenCalledTimes(1);
  });

  it("does not downgrade an existing capability", async () => {
    vi.mocked(prisma.assessmentAttempt.findFirst).mockResolvedValueOnce({
      id: "att1",
      userId: "u1",
      assessmentId: "a1",
      status: "GRADED",
      score: 70,
      accuracyScore: 70,
      reasoningScore: 70,
      categoryPerformance: null,
    } as never);

    vi.mocked(prisma.qualificationRule.findMany).mockResolvedValueOnce([
      {
        id: "r1",
        capabilityId: "c1",
        conditions: { minScore: 60 },
        targetLevel: "BEGINNER",
      },
    ] as never);

    vi.mocked(prisma.userCapability.findFirst).mockResolvedValueOnce({
      id: "uc1",
      level: "ADVANCED",
      score: 95,
    } as never);

    const result = await evaluateQualificationRules("att1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.grants).toHaveLength(1);
      expect(result.grants[0].action).toBe("unchanged");
    }
    expect(prisma.userCapability.update).not.toHaveBeenCalled();
    expect(prisma.capabilityHistory.create).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// listUserCapabilities — mocked Prisma
// ─────────────────────────────────────────────────────────────

describe("listUserCapabilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty array when the user holds no capabilities", async () => {
    vi.mocked(prisma.userCapability.findMany).mockResolvedValueOnce([] as never);

    const result = await listUserCapabilities("u1");

    expect(result).toEqual([]);
  });

  it("maps rows into the view shape including nested capability fields", async () => {
    vi.mocked(prisma.userCapability.findMany).mockResolvedValueOnce([
      {
        id: "uc1",
        capabilityId: "c1",
        level: "ADVANCED",
        score: 92,
        grantedAt: new Date("2026-10-01T09:00:00Z"),
        expiresAt: null,
        capability: {
          name: "Sentiment Analysis",
          slug: "sentiment-analysis",
          category: "NLP",
          description: "Classify text sentiment",
        },
      },
    ] as never);

    const result = await listUserCapabilities("u1");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "uc1",
      capabilityId: "c1",
      name: "Sentiment Analysis",
      slug: "sentiment-analysis",
      category: "NLP",
      description: "Classify text sentiment",
      level: "ADVANCED",
      score: 92,
      grantedAt: "2026-10-01T09:00:00.000Z",
      expiresAt: null,
    });
  });

  it("passes the userId and orders by grantedAt desc", async () => {
    vi.mocked(prisma.userCapability.findMany).mockResolvedValueOnce([] as never);

    await listUserCapabilities("u1");

    const callArg = vi.mocked(prisma.userCapability.findMany).mock.calls[0][0];
    expect(callArg?.where).toEqual({ userId: "u1" });
    expect(callArg?.orderBy).toEqual({ grantedAt: "desc" });
  });
});