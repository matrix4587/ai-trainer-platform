import { describe, it, expect, vi, beforeEach } from "vitest";

import { prisma } from "@/lib/prisma";
import { acceptTask } from "@/server/services/task-assignment.service";

// ─────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────

const baseTask = {
  id: "t1",
  title: "Classify sentiment",
  difficulty: "INTERMEDIATE",
  status: "AVAILABLE",
  maxAssignments: 5,
  project: { id: "p1", name: "Sentiment", status: "ACTIVE" },
  requirements: [],
  _count: { assignments: 0 },
};

const createdAssignmentRow = {
  id: "as1",
  taskId: "t1",
  status: "ACCEPTED",
  assignedAt: new Date("2026-10-04T10:00:00Z"),
  acceptedAt: new Date("2026-10-04T10:00:00Z"),
  startedAt: null,
  submittedAt: null,
  completedAt: null,
  task: {
    title: "Classify sentiment",
    difficulty: "INTERMEDIATE",
    project: { id: "p1", name: "Sentiment" },
  },
};

describe("acceptTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns TASK_NOT_FOUND when the task does not exist", async () => {
    vi.mocked(prisma.task.findFirst).mockResolvedValueOnce(null);

    const result = await acceptTask("t-missing", "u1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("TASK_NOT_FOUND");
  });

  it("returns TASK_NOT_AVAILABLE when the task is not AVAILABLE", async () => {
    vi.mocked(prisma.task.findFirst).mockResolvedValueOnce({
      ...baseTask,
      status: "DRAFT",
    } as never);

    const result = await acceptTask("t1", "u1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("TASK_NOT_AVAILABLE");
  });

  it("returns PROJECT_NOT_ACTIVE when the project is paused", async () => {
    vi.mocked(prisma.task.findFirst).mockResolvedValueOnce({
      ...baseTask,
      project: { id: "p1", name: "Sentiment", status: "PAUSED" },
    } as never);

    const result = await acceptTask("t1", "u1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("PROJECT_NOT_ACTIVE");
  });

  it("returns TASK_FULL when assignments are at capacity", async () => {
    vi.mocked(prisma.task.findFirst).mockResolvedValueOnce({
      ...baseTask,
      maxAssignments: 3,
      _count: { assignments: 3 },
    } as never);
    vi.mocked(prisma.taskAssignment.findFirst).mockResolvedValueOnce(null);

    const result = await acceptTask("t1", "u1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("TASK_FULL");
  });

  it("returns NOT_QUALIFIED when the user lacks a required capability", async () => {
    vi.mocked(prisma.task.findFirst).mockResolvedValueOnce({
      ...baseTask,
      requirements: [
        { capabilityId: "c1", minLevel: "ADVANCED", minScore: null },
      ],
    } as never);
    vi.mocked(prisma.taskAssignment.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.userCapability.findMany).mockResolvedValueOnce([] as never);

    const result = await acceptTask("t1", "u1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("NOT_QUALIFIED");
  });

  it("returns NOT_QUALIFIED when the user's level is too low", async () => {
    vi.mocked(prisma.task.findFirst).mockResolvedValueOnce({
      ...baseTask,
      requirements: [
        { capabilityId: "c1", minLevel: "EXPERT", minScore: null },
      ],
    } as never);
    vi.mocked(prisma.taskAssignment.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.userCapability.findMany).mockResolvedValueOnce([
      { capabilityId: "c1", level: "INTERMEDIATE", score: 90 },
    ] as never);

    const result = await acceptTask("t1", "u1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("NOT_QUALIFIED");
  });

  it("returns NOT_QUALIFIED when minScore is not met", async () => {
    vi.mocked(prisma.task.findFirst).mockResolvedValueOnce({
      ...baseTask,
      requirements: [
        { capabilityId: "c1", minLevel: "BEGINNER", minScore: 85 },
      ],
    } as never);
    vi.mocked(prisma.taskAssignment.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.userCapability.findMany).mockResolvedValueOnce([
      { capabilityId: "c1", level: "ADVANCED", score: 70 },
    ] as never);

    const result = await acceptTask("t1", "u1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("NOT_QUALIFIED");
  });

  it("is idempotent — returns the existing assignment instead of creating a second one", async () => {
    vi.mocked(prisma.task.findFirst).mockResolvedValueOnce(baseTask as never);
    vi.mocked(prisma.taskAssignment.findFirst).mockResolvedValueOnce({
      id: "as-existing",
    } as never);
    vi.mocked(prisma.taskAssignment.findFirst).mockResolvedValueOnce({
      ...createdAssignmentRow,
      id: "as-existing",
    } as never);

    const result = await acceptTask("t1", "u1");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.alreadyExisted).toBe(true);
    expect(prisma.taskAssignment.create).not.toHaveBeenCalled();
  });

  it("creates the assignment when everything checks out", async () => {
    vi.mocked(prisma.task.findFirst).mockResolvedValueOnce(baseTask as never);
    vi.mocked(prisma.taskAssignment.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.userCapability.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.taskAssignment.create).mockResolvedValueOnce({
      id: "as1",
    } as never);
    vi.mocked(prisma.taskAssignment.findFirst).mockResolvedValueOnce(
      createdAssignmentRow as never,
    );

    const result = await acceptTask("t1", "u1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.alreadyExisted).toBe(false);
      expect(result.assignment.id).toBe("as1");
      expect(result.assignment.status).toBe("ACCEPTED");
      expect(result.assignment.taskId).toBe("t1");
    }
    expect(prisma.taskAssignment.create).toHaveBeenCalledTimes(1);
  });
});
