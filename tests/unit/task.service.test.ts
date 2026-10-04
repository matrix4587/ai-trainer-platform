import { describe, it, expect, vi, beforeEach } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  listAvailableTasksForUser,
  meetsRequirement,
} from "@/server/services/task.service";

// ─────────────────────────────────────────────────────────────
// Pure helper tests — no Prisma
// ─────────────────────────────────────────────────────────────

describe("meetsRequirement", () => {
  it("returns false when the user holds no such capability", () => {
    expect(
      meetsRequirement(undefined, { minLevel: "BEGINNER", minScore: null }),
    ).toBe(false);
  });

  it("returns true when levels match exactly and no score is required", () => {
    expect(
      meetsRequirement(
        { level: "INTERMEDIATE", score: 70 },
        { minLevel: "INTERMEDIATE", minScore: null },
      ),
    ).toBe(true);
  });

  it("returns false when user level is below required", () => {
    expect(
      meetsRequirement(
        { level: "BEGINNER", score: 99 },
        { minLevel: "ADVANCED", minScore: null },
      ),
    ).toBe(false);
  });

  it("returns true when user level exceeds required", () => {
    expect(
      meetsRequirement(
        { level: "EXPERT", score: 60 },
        { minLevel: "BEGINNER", minScore: null },
      ),
    ).toBe(true);
  });

  it("enforces minScore when it is set", () => {
    expect(
      meetsRequirement(
        { level: "ADVANCED", score: 70 },
        { minLevel: "ADVANCED", minScore: 80 },
      ),
    ).toBe(false);
    expect(
      meetsRequirement(
        { level: "ADVANCED", score: 85 },
        { minLevel: "ADVANCED", minScore: 80 },
      ),
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// Service tests — mocked Prisma
// ─────────────────────────────────────────────────────────────

const baseTask = {
  id: "t1",
  title: "Classify sentiment",
  instructions: null,
  difficulty: "INTERMEDIATE",
  estimatedMinutes: 15,
  deadline: null,
  ratePerHourCents: 500,
  maxAssignments: 5,
  priority: 0,
  project: { id: "p1", name: "Sentiment", slug: "sentiment", currency: "USD" },
  requirements: [],
  _count: { assignments: 0 },
};

describe("listAvailableTasksForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns USER_NOT_FOUND when the user does not exist", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);

    const result = await listAvailableTasksForUser("u1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("USER_NOT_FOUND");
  });

  it("returns every AVAILABLE task with no requirements", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      id: "u1",
      status: "ACTIVE",
    } as never);
    vi.mocked(prisma.userCapability.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.task.findMany).mockResolvedValueOnce([
      { ...baseTask, requirements: [] },
    ] as never);

    const result = await listAvailableTasksForUser("u1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].id).toBe("t1");
    }
  });

  it("includes a task when the user's capability satisfies the requirement", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      id: "u1",
      status: "ACTIVE",
    } as never);
    vi.mocked(prisma.userCapability.findMany).mockResolvedValueOnce([
      { capabilityId: "c1", level: "ADVANCED", score: 90 },
    ] as never);
    vi.mocked(prisma.task.findMany).mockResolvedValueOnce([
      {
        ...baseTask,
        requirements: [
          {
            capabilityId: "c1",
            minLevel: "INTERMEDIATE",
            minScore: 80,
            capability: { name: "Sentiment Analysis" },
          },
        ],
      },
    ] as never);

    const result = await listAvailableTasksForUser("u1");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tasks).toHaveLength(1);
  });

  it("excludes a task when the user lacks the required capability", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      id: "u1",
      status: "ACTIVE",
    } as never);
    vi.mocked(prisma.userCapability.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.task.findMany).mockResolvedValueOnce([
      {
        ...baseTask,
        requirements: [
          {
            capabilityId: "c1",
            minLevel: "BEGINNER",
            minScore: null,
            capability: { name: "Sentiment Analysis" },
          },
        ],
      },
    ] as never);

    const result = await listAvailableTasksForUser("u1");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tasks).toHaveLength(0);
  });

  it("excludes a task when the user's level is below the requirement", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      id: "u1",
      status: "ACTIVE",
    } as never);
    vi.mocked(prisma.userCapability.findMany).mockResolvedValueOnce([
      { capabilityId: "c1", level: "BEGINNER", score: 99 },
    ] as never);
    vi.mocked(prisma.task.findMany).mockResolvedValueOnce([
      {
        ...baseTask,
        requirements: [
          {
            capabilityId: "c1",
            minLevel: "ADVANCED",
            minScore: null,
            capability: { name: "Sentiment Analysis" },
          },
        ],
      },
    ] as never);

    const result = await listAvailableTasksForUser("u1");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tasks).toHaveLength(0);
  });

  it("excludes a task when the user's score is below minScore", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      id: "u1",
      status: "ACTIVE",
    } as never);
    vi.mocked(prisma.userCapability.findMany).mockResolvedValueOnce([
      { capabilityId: "c1", level: "ADVANCED", score: 70 },
    ] as never);
    vi.mocked(prisma.task.findMany).mockResolvedValueOnce([
      {
        ...baseTask,
        requirements: [
          {
            capabilityId: "c1",
            minLevel: "ADVANCED",
            minScore: 85,
            capability: { name: "Sentiment Analysis" },
          },
        ],
      },
    ] as never);

    const result = await listAvailableTasksForUser("u1");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tasks).toHaveLength(0);
  });

  it("excludes a task whose assignments are at capacity", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      id: "u1",
      status: "ACTIVE",
    } as never);
    vi.mocked(prisma.userCapability.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.task.findMany).mockResolvedValueOnce([
      { ...baseTask, maxAssignments: 3, _count: { assignments: 3 }, requirements: [] },
    ] as never);

    const result = await listAvailableTasksForUser("u1");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tasks).toHaveLength(0);
  });

  it("requires ALL requirements to be satisfied, not just one", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      id: "u1",
      status: "ACTIVE",
    } as never);
    vi.mocked(prisma.userCapability.findMany).mockResolvedValueOnce([
      { capabilityId: "c1", level: "ADVANCED", score: 90 },
      // c2 is missing — user only holds one of the two required
    ] as never);
    vi.mocked(prisma.task.findMany).mockResolvedValueOnce([
      {
        ...baseTask,
        requirements: [
          { capabilityId: "c1", minLevel: "INTERMEDIATE", minScore: null, capability: { name: "A" } },
          { capabilityId: "c2", minLevel: "BEGINNER", minScore: null, capability: { name: "B" } },
        ],
      },
    ] as never);

    const result = await listAvailableTasksForUser("u1");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tasks).toHaveLength(0);
  });
});