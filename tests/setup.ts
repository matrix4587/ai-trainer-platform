import { vi, beforeEach } from "vitest";

// ─────────────────────────────────────────────────────────────
// Global test setup.
// Any module that imports @/lib/prisma gets a mocked client,
// so tests never touch the real Neon database.
// Expand the mocked surface as more services are added.
// ─────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => {
  const assessment = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
  };

  const assessmentAttempt = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  };

  const assessmentAnswer = {
    findMany: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  };

  const question = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  };

  const qualificationRule = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  };

  const userCapability = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const capabilityHistory = {
    create: vi.fn(),
    findMany: vi.fn(),
  };

  const capability = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  };

  return {
    prisma: {
      assessment,
      assessmentAttempt,
      assessmentAnswer,
      question,
      qualificationRule,
      userCapability,
      capabilityHistory,
      capability,
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});