import { describe, it, expect, vi, beforeEach } from "vitest";

import { prisma } from "@/lib/prisma";
import { getAssessmentBySlug } from "@/server/services/assessment.service";

// ─────────────────────────────────────────────────────────────
// Fixture: what Prisma would return for a PUBLISHED assessment
// with one section and one question that has TWO options.
// One option is marked correct in the DB — the service MUST
// strip that before returning.
// ─────────────────────────────────────────────────────────────

const dbRow = {
  id: "a1",
  name: "General Reasoning",
  slug: "general-reasoning",
  description: "Basic reasoning tasks",
  category: "reasoning",
  difficulty: "INTERMEDIATE",
  status: "PUBLISHED",
  timeLimitMinutes: 30,
  passingScore: 80,
  maxAttempts: 2,
  randomizeQuestions: true,
  randomizeOptions: true,
  antiCheatEnabled: true,
  _count: { questions: 1 },
  sections: [
    {
      id: "s1",
      title: "Section One",
      description: null,
      order: 0,
      questions: [
        {
          id: "q1",
          type: "MULTIPLE_CHOICE",
          prompt: "What is 2 + 2?",
          points: 1,
          order: 0,
          metadata: null,
          correctAnswer: { value: "4" }, // must be stripped
          rubric: { note: "secret" },    // must be stripped
          options: [
            { id: "o1", label: "4", order: 0, isCorrect: true },   // isCorrect must be stripped
            { id: "o2", label: "5", order: 1, isCorrect: false },  // isCorrect must be stripped
          ],
        },
      ],
    },
  ],
  // top-level questions with no section — service must NOT double-count
  questions: [],
};

describe("getAssessmentBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no published assessment matches the slug", async () => {
    vi.mocked(prisma.assessment.findFirst).mockResolvedValueOnce(null);

    const result = await getAssessmentBySlug("does-not-exist", "u1");

    expect(result).toBeNull();
    expect(prisma.assessment.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.assessmentAttempt.count).not.toHaveBeenCalled();
  });

  it("queries only PUBLISHED assessments", async () => {
    vi.mocked(prisma.assessment.findFirst).mockResolvedValueOnce(null);

    await getAssessmentBySlug("general-reasoning", "u1");

    const callArg = vi.mocked(prisma.assessment.findFirst).mock.calls[0][0];
    expect(callArg?.where).toEqual({
      slug: "general-reasoning",
      status: "PUBLISHED",
    });
  });

  it("strips correctAnswer, rubric, and option.isCorrect from the response", async () => {
    vi.mocked(prisma.assessment.findFirst).mockResolvedValueOnce(dbRow as never);
    vi.mocked(prisma.assessmentAttempt.count).mockResolvedValueOnce(0);

    const result = await getAssessmentBySlug("general-reasoning", "u1");

    expect(result).not.toBeNull();

    const q = result!.sections[0].questions[0] as Record<string, unknown>;

    // The following keys must not exist on the returned object
    expect(q).not.toHaveProperty("correctAnswer");
    expect(q).not.toHaveProperty("rubric");

    // Option must not leak isCorrect
    const opt = (q.options as Array<Record<string, unknown>>)[0];
    expect(opt).not.toHaveProperty("isCorrect");
    expect(opt).toEqual({ id: "o1", label: "4", order: 0 });
  });

  it("computes attemptsRemaining from maxAttempts minus attemptsUsed", async () => {
    vi.mocked(prisma.assessment.findFirst).mockResolvedValueOnce(dbRow as never);
    vi.mocked(prisma.assessmentAttempt.count).mockResolvedValueOnce(1);

    const result = await getAssessmentBySlug("general-reasoning", "u1");

    expect(result!.maxAttempts).toBe(2);
    expect(result!.attemptsUsed).toBe(1);
    expect(result!.attemptsRemaining).toBe(1);
  });

  it("never reports negative attemptsRemaining", async () => {
    vi.mocked(prisma.assessment.findFirst).mockResolvedValueOnce(dbRow as never);
    vi.mocked(prisma.assessmentAttempt.count).mockResolvedValueOnce(5);

    const result = await getAssessmentBySlug("general-reasoning", "u1");

    expect(result!.attemptsRemaining).toBe(0);
  });

  it("counts attempts excluding ABANDONED", async () => {
    vi.mocked(prisma.assessment.findFirst).mockResolvedValueOnce(dbRow as never);
    vi.mocked(prisma.assessmentAttempt.count).mockResolvedValueOnce(0);

    await getAssessmentBySlug("general-reasoning", "u1");

    const countArg = vi.mocked(prisma.assessmentAttempt.count).mock.calls[0][0];
    expect(countArg?.where).toEqual({
      assessmentId: "a1",
      userId: "u1",
      status: { not: "ABANDONED" },
    });
  });
});