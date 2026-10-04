import { describe, it, expect, vi, beforeEach } from "vitest";

import { prisma } from "@/lib/prisma";
import { getWalletForUser } from "@/server/services/wallet.service";

describe("getWalletForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zeroed summary when the user has no wallet", async () => {
    vi.mocked(prisma.wallet.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.transaction.findMany).mockResolvedValueOnce([] as never);

    const result = await getWalletForUser("u1");

    expect(result.summary).toEqual({
      balanceCents: 0,
      pendingCents: 0,
      lifetimeEarningsCents: 0,
      totalWithdrawnCents: 0,
      currency: "USD",
    });
    expect(result.recentTransactions).toEqual([]);
  });

  it("returns the wallet summary when one exists", async () => {
    vi.mocked(prisma.wallet.findUnique).mockResolvedValueOnce({
      balanceCents: 12500,
      pendingCents: 3000,
      lifetimeEarningsCents: 50000,
      totalWithdrawnCents: 37500,
      currency: "USD",
    } as never);
    vi.mocked(prisma.transaction.findMany).mockResolvedValueOnce([] as never);

    const result = await getWalletForUser("u1");

    expect(result.summary.balanceCents).toBe(12500);
    expect(result.summary.pendingCents).toBe(3000);
    expect(result.summary.lifetimeEarningsCents).toBe(50000);
    expect(result.summary.totalWithdrawnCents).toBe(37500);
    expect(result.summary.currency).toBe("USD");
  });

  it("maps transactions to the view shape and orders newest first", async () => {
    vi.mocked(prisma.wallet.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.transaction.findMany).mockResolvedValueOnce([
      {
        id: "tx1",
        type: "TASK_EARNING",
        status: "APPROVED",
        amountCents: 800,
        currency: "USD",
        description: "Classify a customer review",
        reference: "sub_abc123",
        createdAt: new Date("2026-10-04T12:00:00Z"),
      },
      {
        id: "tx2",
        type: "WITHDRAWAL",
        status: "PAID",
        amountCents: -5000,
        currency: "USD",
        description: "Withdrawal to bank",
        reference: "wd_def456",
        createdAt: new Date("2026-10-01T09:00:00Z"),
      },
    ] as never);

    const result = await getWalletForUser("u1");

    expect(result.recentTransactions).toHaveLength(2);
    expect(result.recentTransactions[0]).toEqual({
      id: "tx1",
      type: "TASK_EARNING",
      status: "APPROVED",
      amountCents: 800,
      currency: "USD",
      description: "Classify a customer review",
      reference: "sub_abc123",
      createdAt: "2026-10-04T12:00:00.000Z",
    });

    const findManyCall = vi.mocked(prisma.transaction.findMany).mock.calls[0][0];
    expect(findManyCall?.where).toEqual({ userId: "u1" });
    expect(findManyCall?.orderBy).toEqual({ createdAt: "desc" });
    expect(findManyCall?.take).toBe(20);
  });
});
