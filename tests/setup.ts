import { vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => {
  const user = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  };

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

  const task = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  };

  const project = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  };

  const taskAssignment = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  };

  const taskSubmission = {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  };

  const qualityScore = {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  };

  const wallet = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const transaction = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  };

  const notification = {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  };

  const taskReview = {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  };

  // $transaction passes the same mock client to the callback.
  // The callback can call any of the mocked methods, and they'll
  // work the same way as calling prisma directly.
  const $transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      wallet,
      transaction,
      notification,
      taskReview,
      taskAssignment,
      taskSubmission,
    };
    return fn(tx);
  });

  return {
    prisma: {
      user,
      assessment,
      assessmentAttempt,
      assessmentAnswer,
      question,
      qualificationRule,
      userCapability,
      capabilityHistory,
      capability,
      task,
      project,
      taskAssignment,
      taskSubmission,
      qualityScore,
      wallet,
      transaction,
      notification,
      taskReview,
      $transaction,
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});