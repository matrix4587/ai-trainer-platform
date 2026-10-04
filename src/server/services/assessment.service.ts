import { prisma } from "@/lib/prisma";
import type { AssessmentDifficulty, QuestionType } from "@prisma/client";

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

export type AssessmentListItem = PublicAssessmentSummary & {
  attemptsUsed: number;
  attemptsRemaining: number;
  lastAttemptStatus: string | null;
  lastAttemptScore: number | null;
  lastAttemptAt: string | null;
};

export type AttemptHistoryItem = {
  id: string;
  status: string;
  score: number | null;
  startedAt: string;
  submittedAt: string | null;
  gradedAt: string | null;
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
// listAssessmentsForUser
// ─────────────────────────────────────────────────────────────

export async function listAssessmentsForUser(
  userId: string,
): Promise<AssessmentListItem[]> {
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

  if (assessments.length === 0) return [];

  const assessmentIds = assessments.map((a) => a.id);

  const attempts = await prisma.assessmentAttempt.findMany({
    where: {
      userId,
      assessmentId: { in: assessmentIds },
      status: { not: "ABANDONED" },
    },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      assessmentId: true,
      status: true,
      score: true,
      startedAt: true,
    },
  });

  const byAssessment = new Map<
    string,
    {
      count: number;
      lastStatus: string | null;
      lastScore: number | null;
      lastAt: string | null;
    }
  >();

  for (const att of attempts) {
    const bucket = byAssessment.get(att.assessmentId);
    if (!bucket) {
      byAssessment.set(att.assessmentId, {
        count: 1,
        lastStatus: att.status,
        lastScore: att.score,
        lastAt: att.startedAt.toISOString(),
      });
    } else {
      bucket.count += 1;
    }
  }

  return assessments.map((a) => {
    const bucket = byAssessment.get(a.id);
    const attemptsUsed = bucket?.count ?? 0;
    return {
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
      attemptsUsed,
      attemptsRemaining: Math.max(0, a.maxAttempts - attemptsUsed),
      lastAttemptStatus: bucket?.lastStatus ?? null,
      lastAttemptScore: bucket?.lastScore ?? null,
      lastAttemptAt: bucket?.lastAt ?? null,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// getAssessmentBySlug
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

// ─────────────────────────────────────────────────────────────
// getAssessmentAttemptsForUser
// ─────────────────────────────────────────────────────────────

export async function getAssessmentAttemptsForUser(
  slug: string,
  userId: string,
): Promise<AttemptHistoryItem[]> {
  const assessment = await prisma.assessment.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { id: true },
  });

  if (!assessment) return [];

  const attempts = await prisma.assessmentAttempt.findMany({
    where: {
      assessmentId: assessment.id,
      userId,
    },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      status: true,
      score: true,
      startedAt: true,
      submittedAt: true,
      gradedAt: true,
    },
  });

  return attempts.map((a) => ({
    id: a.id,
    status: a.status,
    score: a.score,
    startedAt: a.startedAt.toISOString(),
    submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
    gradedAt: a.gradedAt ? a.gradedAt.toISOString() : null,
  }));
}