import { prisma } from "@/lib/prisma";
import type { AssignmentStatus, CapabilityLevel } from "@prisma/client";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type PublicAssignment = {
  id: string;
  taskId: string;
  taskTitle: string;
  taskDifficulty: string;
  projectId: string;
  projectName: string;
  status: AssignmentStatus;
  assignedAt: string;
  acceptedAt: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
};

export type AcceptTaskResult =
  | { ok: true; assignment: PublicAssignment; alreadyExisted: boolean }
  | {
      ok: false;
      reason:
        | "TASK_NOT_FOUND"
        | "TASK_NOT_AVAILABLE"
        | "PROJECT_NOT_ACTIVE"
        | "NOT_QUALIFIED"
        | "TASK_FULL";
    };

export type ListMyAssignmentsResult = { ok: true; assignments: PublicAssignment[] };

// ─────────────────────────────────────────────────────────────
// Level ordering
// ─────────────────────────────────────────────────────────────

const LEVEL_ORDER: Record<CapabilityLevel, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};

function meetsLevel(userLevel: CapabilityLevel, requiredLevel: CapabilityLevel): boolean {
  return LEVEL_ORDER[userLevel] >= LEVEL_ORDER[requiredLevel];
}

// ─────────────────────────────────────────────────────────────
// Internal: fetch a task with everything needed to decide
// ─────────────────────────────────────────────────────────────

async function loadTaskForAcceptance(taskId: string) {
  return prisma.task.findFirst({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      difficulty: true,
      status: true,
      maxAssignments: true,
      project: {
        select: { id: true, name: true, status: true },
      },
      requirements: {
        select: { capabilityId: true, minLevel: true, minScore: true },
      },
      _count: {
        select: {
          assignments: {
            where: {
              status: { in: ["ACCEPTED", "STARTED", "SUBMITTED", "COMPLETED"] },
            },
          },
        },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Internal: check a user holds all requirements for a task
// ─────────────────────────────────────────────────────────────

async function userQualifiesForTask(
  userId: string,
  requirements: { capabilityId: string; minLevel: CapabilityLevel; minScore: number | null }[],
): Promise<boolean> {
  if (requirements.length === 0) return true;

  const userCaps = await prisma.userCapability.findMany({
    where: {
      userId,
      capabilityId: { in: requirements.map((r) => r.capabilityId) },
    },
    select: { capabilityId: true, level: true, score: true },
  });

  const held = new Map(userCaps.map((c) => [c.capabilityId, c]));

  for (const req of requirements) {
    const h = held.get(req.capabilityId);
    if (!h) return false;
    if (!meetsLevel(h.level, req.minLevel)) return false;
    if (typeof req.minScore === "number" && h.score < req.minScore) return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────
// Internal: build the public shape of an assignment
// ─────────────────────────────────────────────────────────────

async function toPublicAssignment(assignmentId: string): Promise<PublicAssignment | null> {
  const a = await prisma.taskAssignment.findFirst({
    where: { id: assignmentId },
    select: {
      id: true,
      taskId: true,
      status: true,
      assignedAt: true,
      acceptedAt: true,
      startedAt: true,
      submittedAt: true,
      completedAt: true,
      task: {
        select: {
          title: true,
          difficulty: true,
          project: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!a) return null;

  return {
    id: a.id,
    taskId: a.taskId,
    taskTitle: a.task.title,
    taskDifficulty: a.task.difficulty,
    projectId: a.task.project.id,
    projectName: a.task.project.name,
    status: a.status,
    assignedAt: a.assignedAt.toISOString(),
    acceptedAt: a.acceptedAt ? a.acceptedAt.toISOString() : null,
    startedAt: a.startedAt ? a.startedAt.toISOString() : null,
    submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
    completedAt: a.completedAt ? a.completedAt.toISOString() : null,
  };
}

// ─────────────────────────────────────────────────────────────
// acceptTask
// ─────────────────────────────────────────────────────────────

export async function acceptTask(
  taskId: string,
  userId: string,
): Promise<AcceptTaskResult> {
  const task = await loadTaskForAcceptance(taskId);

  if (!task) return { ok: false, reason: "TASK_NOT_FOUND" };
  if (task.status !== "AVAILABLE") return { ok: false, reason: "TASK_NOT_AVAILABLE" };
  if (task.project.status !== "ACTIVE") return { ok: false, reason: "PROJECT_NOT_ACTIVE" };

  // Already assigned to this user? Idempotent — return existing.
  const existing = await prisma.taskAssignment.findFirst({
    where: { taskId, userId },
    select: { id: true },
  });

  if (existing) {
    const pub = await toPublicAssignment(existing.id);
    if (!pub) return { ok: false, reason: "TASK_NOT_FOUND" };
    return { ok: true, assignment: pub, alreadyExisted: true };
  }

  // Capacity check
  if (task._count.assignments >= task.maxAssignments) {
    return { ok: false, reason: "TASK_FULL" };
  }

  // Qualification check — same logic as task availability
  const qualified = await userQualifiesForTask(userId, task.requirements);
  if (!qualified) return { ok: false, reason: "NOT_QUALIFIED" };

  const created = await prisma.taskAssignment.create({
    data: {
      taskId,
      userId,
      status: "ACCEPTED",
      acceptedAt: new Date(),
    },
    select: { id: true },
  });

  const pub = await toPublicAssignment(created.id);
  if (!pub) return { ok: false, reason: "TASK_NOT_FOUND" };
  return { ok: true, assignment: pub, alreadyExisted: false };
}

// ─────────────────────────────────────────────────────────────
// listMyAssignments
// ─────────────────────────────────────────────────────────────

export async function listMyAssignments(
  userId: string,
): Promise<ListMyAssignmentsResult> {
  const rows = await prisma.taskAssignment.findMany({
    where: { userId },
    orderBy: { assignedAt: "desc" },
    select: { id: true },
  });

  const assignments: PublicAssignment[] = [];
  for (const r of rows) {
    const pub = await toPublicAssignment(r.id);
    if (pub) assignments.push(pub);
  }

  return { ok: true, assignments };
}