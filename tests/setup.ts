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
    count: vi.fn(),
  };

  return {
    prisma: {
      assessment,
      assessmentAttempt,
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});