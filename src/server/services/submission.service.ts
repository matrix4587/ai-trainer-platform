import { prisma } from "@/lib/prisma";
import type { AssignmentStatus } from "@prisma/client";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type PublicSubmission = {
  id: string;
  taskId: string;
  assignmentId: string | null;
  submittedAt: string;
  qualityScore: number | null;
  isCorrect: boolean | null;
};

export type SubmitTaskResult =
  | {
      ok: true;
      submission: PublicSubmission;
      assignmentStatus: AssignmentStatus;
    }
  | {
      ok: false;
      reason:
        | "ASSIGNMENT_NOT_FOUND"
        | "ASSIGNMENT_NOT_ACTIVE"
        | "TASK_NOT_FOUND"
        | "INVALID_RESPONSE";
    };

// ─────────────────────────────────────────────────────────────
// Quality scoring
// ─────────────────────────────────────────────────────────────

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === "object" && typeof b === "object") {
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    const ak = Object.keys(ao).sort();
    const bk = Object.keys(bo).sort();
    if (ak.length !== bk.length) return false;
    for (let i = 0; i < ak.length; i += 1) {
      if (ak[i] !== bk[i]) return false;
      if (!deepEqual(ao[ak[i]], bo[bk[i]])) return false;
    }
    return true;
  }
  return false;
}

export function computeQualityScore(input: {
  response: unknown;
  goldAnswer: unknown | null;
  confidence: number | null;
}): { score: number; isCorrect: boolean | null } {
  const { response, goldAnswer, confidence } = input;

  let base: number;
  let isCorrect: boolean | null;

  if (goldAnswer !== null && goldAnswer !== undefined) {
    const correct = deepEqual(response, goldAnswer);
    base = correct ? 100 : 0;
    isCorrect = correct;
  } else {
    base = 70;
    isCorrect = null;
  }

  let nudge = 0;
  if (typeof confidence === "number" && confidence >= 0 && confidence <= 1) {
    nudge = Math.round((confidence - 0.5) * 10);
  }

  const score = Math.max(0, Math.min(100, base + nudge));
  return { score, isCorrect };
}

// ─────────────────────────────────────────────────────────────
// submitTask
// ─────────────────────────────────────────────────────────────

export async function submitTask(
  assignmentId: string,
  userId: string,
  response: unknown,
  confidence: number | null,
  comment: string | null,
): Promise<SubmitTaskResult> {
  if (response === undefined) return { ok: false, reason: "INVALID_RESPONSE" };

  const assignment = await prisma.taskAssignment.findFirst({
    where: { id: assignmentId, userId },
    select: {
      id: true,
      taskId: true,
      status: true,
    },
  });

  if (!assignment) return { ok: false, reason: "ASSIGNMENT_NOT_FOUND" };

  const submittable: AssignmentStatus[] = ["ACCEPTED", "STARTED"];
  if (!submittable.includes(assignment.status)) {
    return { ok: false, reason: "ASSIGNMENT_NOT_ACTIVE" };
  }

  const task = await prisma.task.findFirst({
    where: { id: assignment.taskId },
    select: { id: true, goldAnswer: true },
  });

  if (!task) return { ok: false, reason: "TASK_NOT_FOUND" };

  const { score, isCorrect } = computeQualityScore({
    response,
    goldAnswer: task.goldAnswer ?? null,
    confidence,
  });

  const now = new Date();

  const submission = await prisma.taskSubmission.create({
    data: {
      taskId: task.id,
      userId,
      assignmentId: assignment.id,
      response: response as object,
      confidence: confidence ?? null,
      comment: comment ?? null,
      submittedAt: now,
      isCorrect,
      qualityScore: score,
    },
    select: {
      id: true,
      taskId: true,
      assignmentId: true,
      submittedAt: true,
      qualityScore: true,
      isCorrect: true,
    },
  });

  await prisma.taskAssignment.update({
    where: { id: assignment.id },
    data: { status: "SUBMITTED", submittedAt: now },
  });

  await prisma.qualityScore.create({
    data: {
      userId,
      overallScore: score,
      accuracyScore: isCorrect === true ? 100 : isCorrect === false ? 0 : null,
      tasksCompleted: 1,
    },
  });

  return {
    ok: true,
    submission: {
      id: submission.id,
      taskId: submission.taskId,
      assignmentId: submission.assignmentId,
      submittedAt: submission.submittedAt.toISOString(),
      qualityScore: submission.qualityScore,
      isCorrect: submission.isCorrect,
    },
    assignmentStatus: "SUBMITTED",
  };
}