import { prisma } from "@/lib/prisma";
import type { AssessmentDifficulty, CapabilityLevel, TaskStatus } from "@prisma/client";

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
//
// A task is available if:
//   - task.status === "AVAILABLE"
//   - task is attached to a Project whose status === "ACTIVE"
//   - the user has every TaskCapabilityRequirement satisfied
//     (level >= minLevel AND score >= minScore when set)
//   - the number of active assignments is under maxAssignments
//
// NOTE: this is a correctness-first implementation. If the number
// of AVAILABLE tasks grows large, the per-task requirement check
// can be pushed into a single SQL query using jsonb or a join.
// For now we do it in JS, which is easy to reason about and test.
// ─────────────────────────────────────────────────────────────

export async function listAvailableTasksForUser(
  userId: string,
): Promise<ListAvailableTasksResult> {
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { id: true, status: true },
  });

  if (!user) return { ok: false, reason: "USER_NOT_FOUND" };

  // 1. Every capability this user holds, keyed by capabilityId
  const userCaps = await prisma.userCapability.findMany({
    where: { userId },
    select: { capabilityId: true, level: true, score: true },
  });

  const userCapMap = new Map(
    userCaps.map((c) => [c.capabilityId, { level: c.level, score: c.score }]),
  );

  // 2. Candidate tasks — PUBLISHED and AVAILABLE on an ACTIVE project
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
    // Skip if the task is already fully assigned
    if (t._count.assignments >= t.maxAssignments) continue;

    // Every requirement must be satisfied
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
// Exported helper for tests — pure logic, no DB
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
