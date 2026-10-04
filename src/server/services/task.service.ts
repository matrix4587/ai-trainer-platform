import { prisma } from "@/lib/prisma";
import type {
  AssessmentDifficulty,
  CapabilityLevel,
  TaskStatus,
} from "@prisma/client";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type AvailableTask = {
  id: string;
  title: string;
  instructions: string | null;
  difficulty: AssessmentDifficulty;
  estimatedMinutes: number | null;
  deadline: string | null;
  ratePerHourCents: number | null;
  project: {
    id: string;
    name: string;
    slug: string;
    currency: string;
  };
  requirements: {
    capabilityId: string;
    capabilityName: string;
    minLevel: CapabilityLevel;
    minScore: number | null;
  }[];
};

export type MyAssignmentSummary = {
  id: string;
  status: string;
  taskId: string;
  taskTitle: string;
  taskDifficulty: AssessmentDifficulty;
  projectName: string;
  assignedAt: string;
  submittedAt: string | null;
  qualityScore: number | null;
};

export type ListAvailableTasksResult =
  | { ok: true; tasks: AvailableTask[] }
  | { ok: false; reason: "USER_NOT_FOUND" };

// ─────────────────────────────────────────────────────────────
// Level ordering
// ─────────────────────────────────────────────────────────────

const LEVEL_ORDER: Record<CapabilityLevel, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};

function meetsLevel(
  userLevel: CapabilityLevel,
  requiredLevel: CapabilityLevel,
): boolean {
  return LEVEL_ORDER[userLevel] >= LEVEL_ORDER[requiredLevel];
}

// ─────────────────────────────────────────────────────────────
// listAvailableTasksForUser
// ─────────────────────────────────────────────────────────────

export async function listAvailableTasksForUser(
  userId: string,
): Promise<ListAvailableTasksResult> {
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { id: true, status: true },
  });

  if (!user) return { ok: false, reason: "USER_NOT_FOUND" };

  const userCaps = await prisma.userCapability.findMany({
    where: { userId },
    select: { capabilityId: true, level: true, score: true },
  });

  const userCapMap = new Map(
    userCaps.map((c) => [c.capabilityId, { level: c.level, score: c.score }]),
  );

  const candidates = await prisma.task.findMany({
    where: {
      status: "AVAILABLE",
      project: { status: "ACTIVE" },
    },
    select: {
      id: true,
      title: true,
      instructions: true,
      difficulty: true,
      estimatedMinutes: true,
      deadline: true,
      ratePerHourCents: true,
      maxAssignments: true,
      priority: true,
      project: {
        select: { id: true, name: true, slug: true, currency: true },
      },
      requirements: {
        select: {
          capabilityId: true,
          minLevel: true,
          minScore: true,
          capability: { select: { name: true } },
        },
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
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  const out: AvailableTask[] = [];

  for (const t of candidates) {
    if (t._count.assignments >= t.maxAssignments) continue;

    const qualifies = t.requirements.every((req) => {
      const held = userCapMap.get(req.capabilityId);
      if (!held) return false;
      if (!meetsLevel(held.level, req.minLevel)) return false;
      if (typeof req.minScore === "number" && held.score < req.minScore) return false;
      return true;
    });

    if (!qualifies) continue;

    out.push({
      id: t.id,
      title: t.title,
      instructions: t.instructions,
      difficulty: t.difficulty,
      estimatedMinutes: t.estimatedMinutes,
      deadline: t.deadline ? t.deadline.toISOString() : null,
      ratePerHourCents: t.ratePerHourCents,
      project: t.project,
      requirements: t.requirements.map((r) => ({
        capabilityId: r.capabilityId,
        capabilityName: r.capability.name,
        minLevel: r.minLevel,
        minScore: r.minScore,
      })),
    });
  }

  return { ok: true, tasks: out };
}

// ─────────────────────────────────────────────────────────────
// listMyAssignmentSummaries
// Returns a compact view of the user's assignments for the tasks
// page sidebar ("My tasks" section).
// ─────────────────────────────────────────────────────────────

export async function listMyAssignmentSummaries(
  userId: string,
): Promise<MyAssignmentSummary[]> {
  const rows = await prisma.taskAssignment.findMany({
    where: { userId },
    orderBy: { assignedAt: "desc" },
    select: {
      id: true,
      status: true,
      assignedAt: true,
      submittedAt: true,
      task: {
        select: {
          id: true,
          title: true,
          difficulty: true,
          project: { select: { name: true } },
        },
      },
    },
  });

  // Fetch latest quality scores for each task in one query
  const taskIds = Array.from(new Set(rows.map((r) => r.task.id)));

  const submissions =
    taskIds.length > 0
      ? await prisma.taskSubmission.findMany({
          where: {
            userId,
            taskId: { in: taskIds },
          },
          orderBy: { submittedAt: "desc" },
          select: {
            taskId: true,
            qualityScore: true,
            submittedAt: true,
          },
        })
      : [];

  const scoreByTask = new Map<string, number | null>();
  for (const s of submissions) {
    if (!scoreByTask.has(s.taskId)) {
      scoreByTask.set(s.taskId, s.qualityScore);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    taskId: r.task.id,
    taskTitle: r.task.title,
    taskDifficulty: r.task.difficulty,
    projectName: r.task.project.name,
    assignedAt: r.assignedAt.toISOString(),
    submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
    qualityScore: scoreByTask.get(r.task.id) ?? null,
  }));
}

// ─────────────────────────────────────────────────────────────
// Exported helper (used in tests)
// ─────────────────────────────────────────────────────────────

export function meetsRequirement(
  held: { level: CapabilityLevel; score: number } | undefined,
  req: { minLevel: CapabilityLevel; minScore: number | null },
): boolean {
  if (!held) return false;
  if (!meetsLevel(held.level, req.minLevel)) return false;
  if (typeof req.minScore === "number" && held.score < req.minScore) return false;
  return true;
}