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

  return {
    prisma: {
      assessment,
      assessmentAttempt,
      assessmentAnswer,
      question,
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});