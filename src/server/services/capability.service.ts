import { prisma } from "@/lib/prisma";
import type { CapabilityLevel } from "@prisma/client";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type RuleConditions = {
  minScore?: number;
  maxScore?: number;
  minAccuracy?: number;
  minReasoning?: number;
  category?: string;
  minCategoryScore?: number;
};

export type AttemptSummary = {
  id: string;
  userId: string;
  assessmentId: string;
  score: number | null;
  accuracyScore: number | null;
  reasoningScore: number | null;
  categoryPerformance: unknown;
};

export type GrantResult = {
  capabilityId: string;
  capabilityName: string;
  level: CapabilityLevel;
  score: number;
  action: "created" | "upgraded" | "unchanged";
};

export type EvaluateRulesResult =
  | { ok: true; grants: GrantResult[] }
  | { ok: false; reason: "ATTEMPT_NOT_FOUND" | "ATTEMPT_NOT_GRADED" };

export type UserCapabilityView = {
  id: string;
  capabilityId: string;
  name: string;
  slug: string;
  category: string | null;
  description: string | null;
  level: CapabilityLevel;
  score: number;
  grantedAt: string;
  expiresAt: string | null;
};

// ─────────────────────────────────────────────────────────────
// Level ordering
// ─────────────────────────────────────────────────────────────

const LEVEL_ORDER: Record<CapabilityLevel, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};

function isHigherLevel(a: CapabilityLevel, b: CapabilityLevel): boolean {
  return LEVEL_ORDER[a] > LEVEL_ORDER[b];
}

// ─────────────────────────────────────────────────────────────
// Rule matching
// ─────────────────────────────────────────────────────────────

export function conditionsMatch(
  conditions: RuleConditions,
  attempt: AttemptSummary,
): boolean {
  const score = attempt.score ?? 0;
  const accuracy = attempt.accuracyScore ?? 0;
  const reasoning = attempt.reasoningScore ?? 0;

  if (typeof conditions.minScore === "number" && score < conditions.minScore) {
    return false;
  }
  if (typeof conditions.maxScore === "number" && score > conditions.maxScore) {
    return false;
  }
  if (typeof conditions.minAccuracy === "number" && accuracy < conditions.minAccuracy) {
    return false;
  }
  if (typeof conditions.minReasoning === "number" && reasoning < conditions.minReasoning) {
    return false;
  }

  if (conditions.category) {
    const cp = attempt.categoryPerformance;
    if (!cp || typeof cp !== "object") return false;
    const map = cp as Record<string, unknown>;
    const catScore = map[conditions.category];
    if (typeof catScore !== "number") return false;
    if (
      typeof conditions.minCategoryScore === "number" &&
      catScore < conditions.minCategoryScore
    ) {
      return false;
    }
  }

  return true;
}

// ─────────────────────────────────────────────────────────────
// evaluateQualificationRules
// ─────────────────────────────────────────────────────────────

export async function evaluateQualificationRules(
  attemptId: string,
): Promise<EvaluateRulesResult> {
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { id: attemptId },
    select: {
      id: true,
      userId: true,
      assessmentId: true,
      status: true,
      score: true,
      accuracyScore: true,
      reasoningScore: true,
      categoryPerformance: true,
    },
  });

  if (!attempt) return { ok: false, reason: "ATTEMPT_NOT_FOUND" };
  if (attempt.status !== "GRADED") return { ok: false, reason: "ATTEMPT_NOT_GRADED" };

  const summary: AttemptSummary = {
    id: attempt.id,
    userId: attempt.userId,
    assessmentId: attempt.assessmentId,
    score: attempt.score,
    accuracyScore: attempt.accuracyScore,
    reasoningScore: attempt.reasoningScore,
    categoryPerformance: attempt.categoryPerformance,
  };

  const rules = await prisma.qualificationRule.findMany({
    where: { assessmentId: attempt.assessmentId, isActive: true },
    select: {
      id: true,
      capabilityId: true,
      conditions: true,
      targetLevel: true,
    },
  });

  const grants: GrantResult[] = [];

  for (const rule of rules) {
    const conditions = (rule.conditions ?? {}) as RuleConditions;
    if (!conditionsMatch(conditions, summary)) continue;

    const existing = await prisma.userCapability.findFirst({
      where: {
        userId: attempt.userId,
        capabilityId: rule.capabilityId,
      },
      select: { id: true, level: true, score: true },
    });

    const newScore = summary.score ?? 0;

    if (!existing) {
      await prisma.userCapability.create({
        data: {
          userId: attempt.userId,
          capabilityId: rule.capabilityId,
          level: rule.targetLevel,
          score: newScore,
          sourceRuleId: rule.id,
        },
      });

      await prisma.capabilityHistory.create({
        data: {
          userId: attempt.userId,
          capabilityId: rule.capabilityId,
          previousLevel: null,
          newLevel: rule.targetLevel,
          reason: `Granted by rule ${rule.id} from attempt ${attempt.id}`,
        },
      });

      const cap = await prisma.capability.findFirst({
        where: { id: rule.capabilityId },
        select: { name: true },
      });

      grants.push({
        capabilityId: rule.capabilityId,
        capabilityName: cap?.name ?? "Unknown",
        level: rule.targetLevel,
        score: newScore,
        action: "created",
      });
      continue;
    }

    if (isHigherLevel(rule.targetLevel, existing.level)) {
      await prisma.userCapability.update({
        where: { id: existing.id },
        data: {
          level: rule.targetLevel,
          score: newScore,
          sourceRuleId: rule.id,
        },
      });

      await prisma.capabilityHistory.create({
        data: {
          userId: attempt.userId,
          capabilityId: rule.capabilityId,
          previousLevel: existing.level,
          newLevel: rule.targetLevel,
          reason: `Upgraded by rule ${rule.id} from attempt ${attempt.id}`,
        },
      });

      const cap = await prisma.capability.findFirst({
        where: { id: rule.capabilityId },
        select: { name: true },
      });

      grants.push({
        capabilityId: rule.capabilityId,
        capabilityName: cap?.name ?? "Unknown",
        level: rule.targetLevel,
        score: newScore,
        action: "upgraded",
      });
    } else {
      grants.push({
        capabilityId: rule.capabilityId,
        capabilityName: "Unknown",
        level: existing.level,
        score: existing.score,
        action: "unchanged",
      });
    }
  }

  return { ok: true, grants };
}

// ─────────────────────────────────────────────────────────────
// listUserCapabilities
// ─────────────────────────────────────────────────────────────

export async function listUserCapabilities(
  userId: string,
): Promise<UserCapabilityView[]> {
  const rows = await prisma.userCapability.findMany({
    where: { userId },
    orderBy: { grantedAt: "desc" },
    include: {
      capability: {
        select: { name: true, slug: true, category: true, description: true },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    capabilityId: r.capabilityId,
    name: r.capability.name,
    slug: r.capability.slug,
    category: r.capability.category,
    description: r.capability.description,
    level: r.level,
    score: r.score,
    grantedAt: r.grantedAt.toISOString(),
    expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
  }));
}