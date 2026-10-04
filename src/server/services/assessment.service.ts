import { prisma } from "@/lib/prisma";
import type {
  AssessmentDifficulty,
  QuestionType,
} from "@prisma/client";

// ─────────────────────────────────────────────────────────────
// Public (safe) shapes returned to the client.
// Correct answers and rubrics are NEVER included here.
// ─────────────────────────────────────────────────────────────

export type PublicOption = {
  id: string;
  label: string;
  order: number;
};

export type PublicQuestion = {
  id: string;
  type: QuestionType;
  prompt: string;
  points: number;
  order: number;
  metadata: unknown;
  options: PublicOption[];
};

export type PublicSection = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  questions: PublicQuestion[];
};

export type PublicAssessmentSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  difficulty: AssessmentDifficulty;
  timeLimitMinutes: number;
  passingScore: number;
  maxAttempts: number;
  questionCount: number;
};

export type PublicAssessmentDetail = PublicAssessmentSummary & {
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  antiCheatEnabled: boolean;
  sections: PublicSection[];
  attemptsUsed: number;
  attemptsRemaining: number;
};

// ─────────────────────────────────────────────────────────────
// listPublishedAssessments
// ─────────────────────────────────────────────────────────────

export async function listPublishedAssessments(): Promise<
  PublicAssessmentSummary[]
> {
  const assessments = await prisma.assessment.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      category: true,
      difficulty: true,
      timeLimitMinutes: true,
      passingScore: true,
      maxAttempts: true,
      _count: { select: { questions: true } },
    },
  });

  return assessments.map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    description: a.description,
    category: a.category,
    difficulty: a.difficulty,
    timeLimitMinutes: a.timeLimitMinutes,
    passingScore: a.passingScore,
    maxAttempts: a.maxAttempts,
    questionCount: a._count.questions,
  }));
}

// ─────────────────────────────────────────────────────────────
// getAssessmentBySlug
// Returns null if not found, not published, or draft.
// Strips correctAnswer / rubric / option.isCorrect.
// ─────────────────────────────────────────────────────────────

export async function getAssessmentBySlug(
  slug: string,
  userId: string,
): Promise<PublicAssessmentDetail | null> {
  const assessment = await prisma.assessment.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: {
              options: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  label: true,
                  order: true,
                  // isCorrect is intentionally NOT selected
                },
              },
            },
          },
        },
      },
      questions: {
        where: { sectionId: null },
        orderBy: { order: "asc" },
        include: {
          options: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              label: true,
              order: true,
            },
          },
        },
      },
      _count: { select: { questions: true } },
    },
  });

  if (!assessment) return null;

  // Count this user's existing attempts (all statuses count toward the cap
  // except ABANDONED, which we don't penalize).
  const attemptsUsed = await prisma.assessmentAttempt.count({
    where: {
      assessmentId: assessment.id,
      userId,
      status: { not: "ABANDONED" },
    },
  });

  const mapQuestion = (q: {
    id: string;
    type: QuestionType;
    prompt: string;
    points: number;
    order: number;
    metadata: unknown;
    options: { id: string; label: string; order: number }[];
  }): PublicQuestion => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    points: q.points,
    order: q.order,
    metadata: q.metadata ?? null,
    options: q.options.map((o) => ({
      id: o.id,
      label: o.label,
      order: o.order,
    })),
  });

  const sections: PublicSection[] = assessment.sections.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    order: s.order,
    questions: s.questions.map(mapQuestion),
  }));

  // Questions without a section become a synthetic "General" section
  if (assessment.questions.length > 0) {
    sections.push({
      id: "general",
      title: "General",
      description: null,
      order: sections.length,
      questions: assessment.questions.map(mapQuestion),
    });
  }

  return {
    id: assessment.id,
    name: assessment.name,
    slug: assessment.slug,
    description: assessment.description,
    category: assessment.category,
    difficulty: assessment.difficulty,
    timeLimitMinutes: assessment.timeLimitMinutes,
    passingScore: assessment.passingScore,
    maxAttempts: assessment.maxAttempts,
    questionCount: assessment._count.questions,
    randomizeQuestions: assessment.randomizeQuestions,
    randomizeOptions: assessment.randomizeOptions,
    antiCheatEnabled: assessment.antiCheatEnabled,
    sections,
    attemptsUsed,
    attemptsRemaining: Math.max(0, assessment.maxAttempts - attemptsUsed),
  };
}