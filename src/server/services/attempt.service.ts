import { prisma } from "@/lib/prisma";
import type { AttemptStatus, QuestionType } from "@prisma/client";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type PublicAttemptQuestion = {
  id: string;
  type: QuestionType;
  prompt: string;
  points: number;
  order: number;
  metadata: unknown;
  options: { id: string; label: string; order: number }[];
};

export type PublicAttemptSection = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  questions: PublicAttemptQuestion[];
};

export type PublicAttempt = {
  id: string;
  assessmentId: string;
  assessmentName: string;
  assessmentSlug: string;
  status: AttemptStatus;
  startedAt: string;
  expiresAt: string | null;
  submittedAt: string | null;
  score: number | null;
  sections: PublicAttemptSection[];
  answers: Record<string, unknown>;
};

export type StartAttemptResult =
  | { ok: true; attempt: PublicAttempt }
  | {
      ok: false;
      reason: "NOT_FOUND" | "ATTEMPTS_EXHAUSTED" | "IN_PROGRESS_EXISTS";
      attemptId?: string;
    };

export type SaveAnswerResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "ATTEMPT_NOT_FOUND"
        | "ATTEMPT_NOT_EDITABLE"
        | "QUESTION_NOT_IN_ASSESSMENT"
        | "INVALID_RESPONSE";
    };

export type SubmitAttemptResult =
  | { ok: true; attempt: PublicAttempt }
  | { ok: false; reason: "ATTEMPT_NOT_FOUND" | "ATTEMPT_NOT_EDITABLE" };

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function isAutoGradable(type: QuestionType): boolean {
  return (
    type === "MULTIPLE_CHOICE" ||
    type === "TRUE_FALSE" ||
    type === "MULTIPLE_SELECT"
  );
}

function gradeAnswer(
  type: QuestionType,
  response: unknown,
  correctAnswer: unknown,
  points: number,
): { isCorrect: boolean | null; points: number | null } {
  if (!isAutoGradable(type)) {
    return { isCorrect: null, points: null };
  }

  const ca = correctAnswer as Record<string, unknown> | null;
  const r = response as Record<string, unknown> | null;

  if (!ca || !r) return { isCorrect: false, points: 0 };

  if (type === "MULTIPLE_CHOICE") {
    const correct = ca.optionId;
    const given = r.optionId;
    const isCorrect = correct !== undefined && correct === given;
    return { isCorrect, points: isCorrect ? points : 0 };
  }

  if (type === "TRUE_FALSE") {
    const correct = ca.value;
    const given = r.value;
    const isCorrect = typeof correct === "boolean" && correct === given;
    return { isCorrect, points: isCorrect ? points : 0 };
  }

  if (type === "MULTIPLE_SELECT") {
    const correct = Array.isArray(ca.optionIds) ? (ca.optionIds as string[]) : [];
    const given = Array.isArray(r.optionIds) ? (r.optionIds as string[]) : [];
    const same =
      correct.length === given.length && correct.every((id) => given.includes(id));
    return { isCorrect: same, points: same ? points : 0 };
  }

  return { isCorrect: null, points: null };
}

async function loadPublicAttempt(attemptId: string): Promise<PublicAttempt | null> {
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { id: attemptId },
    include: {
      assessment: { select: { id: true, name: true, slug: true } },
      answers: true,
    },
  });

  if (!attempt) return null;

  const questions = await prisma.question.findMany({
    where: { assessmentId: attempt.assessmentId },
    orderBy: { order: "asc" },
    include: {
      section: {
        select: { id: true, title: true, description: true, order: true },
      },
      options: {
        orderBy: { order: "asc" },
        select: { id: true, label: true, order: true },
      },
    },
  });

  const sectionMap = new Map<string, PublicAttemptSection>();
  const orphans: PublicAttemptQuestion[] = [];

  for (const q of questions) {
    const mapped: PublicAttemptQuestion = {
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      points: q.points,
      order: q.order,
      metadata: q.metadata ?? null,
      options: q.options.map((o) => ({ id: o.id, label: o.label, order: o.order })),
    };

    if (q.section) {
      if (!sectionMap.has(q.section.id)) {
        sectionMap.set(q.section.id, {
          id: q.section.id,
          title: q.section.title,
          description: q.section.description,
          order: q.section.order,
          questions: [],
        });
      }
      sectionMap.get(q.section.id)!.questions.push(mapped);
    } else {
      orphans.push(mapped);
    }
  }

  const sections = Array.from(sectionMap.values()).sort((a, b) => a.order - b.order);
  if (orphans.length > 0) {
    sections.push({
      id: "general",
      title: "General",
      description: null,
      order: sections.length,
      questions: orphans,
    });
  }

  const answers: Record<string, unknown> = {};
  for (const a of attempt.answers) {
    answers[a.questionId] = a.response;
  }

  return {
    id: attempt.id,
    assessmentId: attempt.assessmentId,
    assessmentName: attempt.assessment.name,
    assessmentSlug: attempt.assessment.slug,
    status: attempt.status,
    startedAt: attempt.startedAt.toISOString(),
    expiresAt: attempt.expiresAt ? attempt.expiresAt.toISOString() : null,
    submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : null,
    score: attempt.score,
    sections,
    answers,
  };
}

// ─────────────────────────────────────────────────────────────
// startAttempt
// ─────────────────────────────────────────────────────────────

export async function startAttempt(
  slug: string,
  userId: string,
): Promise<StartAttemptResult> {
  const assessment = await prisma.assessment.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { id: true, timeLimitMinutes: true, maxAttempts: true },
  });

  if (!assessment) return { ok: false, reason: "NOT_FOUND" };

  const existing = await prisma.assessmentAttempt.findFirst({
    where: { assessmentId: assessment.id, userId, status: "IN_PROGRESS" },
    select: { id: true },
  });

  if (existing) {
    const attempt = await loadPublicAttempt(existing.id);
    if (attempt) return { ok: true, attempt };
    return { ok: false, reason: "NOT_FOUND" };
  }

  const used = await prisma.assessmentAttempt.count({
    where: {
      assessmentId: assessment.id,
      userId,
      status: { not: "ABANDONED" },
    },
  });

  if (used >= assessment.maxAttempts) {
    return { ok: false, reason: "ATTEMPTS_EXHAUSTED" };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + assessment.timeLimitMinutes * 60_000);

  const created = await prisma.assessmentAttempt.create({
    data: {
      assessmentId: assessment.id,
      userId,
      status: "IN_PROGRESS",
      startedAt: now,
      expiresAt,
    },
    select: { id: true },
  });

  const attempt = await loadPublicAttempt(created.id);
  if (!attempt) return { ok: false, reason: "NOT_FOUND" };
  return { ok: true, attempt };
}

// ─────────────────────────────────────────────────────────────
// saveAnswer
// ─────────────────────────────────────────────────────────────

export async function saveAnswer(
  attemptId: string,
  userId: string,
  questionId: string,
  response: unknown,
): Promise<SaveAnswerResult> {
  if (response === undefined) return { ok: false, reason: "INVALID_RESPONSE" };

  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { id: attemptId, userId },
    select: { id: true, status: true, assessmentId: true, expiresAt: true },
  });

  if (!attempt) return { ok: false, reason: "ATTEMPT_NOT_FOUND" };

  if (attempt.status !== "IN_PROGRESS") {
    return { ok: false, reason: "ATTEMPT_NOT_EDITABLE" };
  }

  if (attempt.expiresAt && attempt.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "ATTEMPT_NOT_EDITABLE" };
  }

  const question = await prisma.question.findFirst({
    where: { id: questionId, assessmentId: attempt.assessmentId },
    select: { id: true },
  });

  if (!question) return { ok: false, reason: "QUESTION_NOT_IN_ASSESSMENT" };

  await prisma.assessmentAnswer.upsert({
    where: { attemptId_questionId: { attemptId, questionId } },
    create: { attemptId, questionId, response: response as object },
    update: { response: response as object },
  });

  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// submitAttempt
// ─────────────────────────────────────────────────────────────

export async function submitAttempt(
  attemptId: string,
  userId: string,
): Promise<SubmitAttemptResult> {
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { id: attemptId, userId },
    select: { id: true, status: true, assessmentId: true },
  });

  if (!attempt) return { ok: false, reason: "ATTEMPT_NOT_FOUND" };
  if (attempt.status !== "IN_PROGRESS") {
    return { ok: false, reason: "ATTEMPT_NOT_EDITABLE" };
  }

  const questions = await prisma.question.findMany({
    where: { assessmentId: attempt.assessmentId },
    select: { id: true, type: true, points: true, correctAnswer: true },
  });

  const answers = await prisma.assessmentAnswer.findMany({
    where: { attemptId },
    select: { id: true, questionId: true, response: true },
  });

  const answerByQuestion = new Map(answers.map((a) => [a.questionId, a]));

  let earnedPoints = 0;
  let totalPoints = 0;
  const perQuestionUpdates: {
    id: string;
    isCorrect: boolean | null;
    points: number | null;
  }[] = [];

  for (const q of questions) {
    totalPoints += q.points;
    const ans = answerByQuestion.get(q.id);

    if (!ans) {
      if (isAutoGradable(q.type)) {
        perQuestionUpdates.push({ id: q.id, isCorrect: false, points: 0 });
      }
      continue;
    }

    const { isCorrect, points } = gradeAnswer(
      q.type,
      ans.response,
      q.correctAnswer,
      q.points,
    );

    if (points !== null) earnedPoints += points;
    perQuestionUpdates.push({ id: ans.id, isCorrect, points });
  }

  for (const upd of perQuestionUpdates) {
    const exists = answers.some((a) => a.id === upd.id);
    if (!exists) continue;
    await prisma.assessmentAnswer.update({
      where: { id: upd.id },
      data: { isCorrect: upd.isCorrect, points: upd.points },
    });
  }

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const now = new Date();

  await prisma.assessmentAttempt.update({
    where: { id: attemptId },
    data: {
      status: "GRADED",
      submittedAt: now,
      gradedAt: now,
      score,
      accuracyScore: score,
    },
  });

  const refreshed = await loadPublicAttempt(attemptId);
  if (!refreshed) return { ok: false, reason: "ATTEMPT_NOT_FOUND" };
  return { ok: true, attempt: refreshed };
}
