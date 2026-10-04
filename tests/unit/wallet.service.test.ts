import { describe, it, expect, vi, beforeEach } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  computePaymentCents,
  creditWallet,
  getWalletForUser,
} from "@/server/services/wallet.service";

// ─────────────────────────────────────────────────────────────
// getWalletForUser
// ─────────────────────────────────────────────────────────────

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
    ] as never);

    const result = await getWalletForUser("u1");

    expect(result.recentTransactions).toHaveLength(1);
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
  });
});

// ─────────────────────────────────────────────────────────────
// computePaymentCents
// ─────────────────────────────────────────────────────────────

describe("computePaymentCents", () => {
  it("returns 0 when rate is null", () => {
    expect(
      computePaymentCents({
        ratePerHourCents: null,
        estimatedMinutes: 10,
        qualityScore: 100,
        qualityThreshold: 85,
      }),
    ).toBe(0);
  });

  it("returns 0 when estimatedMinutes is null or <= 0", () => {
    expect(
      computePaymentCents({
        ratePerHourCents: 600,
        estimatedMinutes: null,
        qualityScore: 100,
        qualityThreshold: 85,
      }),
    ).toBe(0);
    expect(
      computePaymentCents({
        ratePerHourCents: 600,
        estimatedMinutes: 0,
        qualityScore: 100,
        qualityThreshold: 85,
      }),
    ).toBe(0);
  });

  it("returns 0 when qualityScore is below threshold", () => {
    expect(
      computePaymentCents({
        ratePerHourCents: 600,
        estimatedMinutes: 10,
        qualityScore: 70,
        qualityThreshold: 85,
      }),
    ).toBe(0);
  });

  it("pays full rate when qualityScore >= threshold", () => {
    // 600 cents/hr * (10/60) hr = 100 cents
    expect(
      computePaymentCents({
        ratePerHourCents: 600,
        estimatedMinutes: 10,
        qualityScore: 85,
        qualityThreshold: 85,
      }),
    ).toBe(100);
    expect(
      computePaymentCents({
        ratePerHourCents: 600,
        estimatedMinutes: 10,
        qualityScore: 100,
        qualityThreshold: 85,
      }),
    ).toBe(100);
  });

  it("rounds to the nearest cent", () => {
    // 800 cents/hr * (3/60) hr = 40 cents
    expect(
      computePaymentCents({
        ratePerHourCents: 800,
        estimatedMinutes: 3,
        qualityScore: 100,
        qualityThreshold: 85,
      }),
    ).toBe(40);
  });
});

// ─────────────────────────────────────────────────────────────
// creditWallet
// ─────────────────────────────────────────────────────────────

describe("creditWallet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects zero or non-integer amounts", async () => {
    const zero = await creditWallet({
      userId: "u1",
      amountCents: 0,
      type: "TASK_EARNING",
    });
    expect(zero.ok).toBe(false);

    const frac = await creditWallet({
      userId: "u1",
      amountCents: 12.5,
      type: "TASK_EARNING",
    });
    expect(frac.ok).toBe(false);
  });

  it("creates a transaction and updates the wallet balance", async () => {
    vi.mocked(prisma.wallet.findUnique).mockResolvedValueOnce({
      id: "w1",
      currency: "USD",
    } as never);
    vi.mocked(prisma.transaction.create).mockResolvedValueOnce({
      id: "tx1",
    } as never);
    vi.mocked(prisma.wallet.update).mockResolvedValueOnce({
      balanceCents: 5000,
    } as never);

    const result = await creditWallet({
      userId: "u1",
      amountCents: 800,
      type: "TASK_EARNING",
      description: "Test",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.transactionId).toBe("tx1");
      expect(result.newBalanceCents).toBe(5000);
    }

    const txArg = vi.mocked(prisma.transaction.create).mock.calls[0][0];
    expect(txArg?.data).toMatchObject({
      userId: "u1",
      type: "TASK_EARNING",
      amountCents: 800,
      status: "APPROVED",
      currency: "USD",
    });

    const walletArg = vi.mocked(prisma.wallet.update).mock.calls[0][0];
    expect(walletArg?.data).toMatchObject({
      balanceCents: { increment: 800 },
      lifetimeEarningsCents: { increment: 800 },
    });
  });

  it("does not increment lifetime earnings for negative amounts", async () => {
    vi.mocked(prisma.wallet.findUnique).mockResolvedValueOnce({
      id: "w1",
      currency: "USD",
    } as never);
    vi.mocked(prisma.transaction.create).mockResolvedValueOnce({
      id: "tx1",
    } as never);
    vi.mocked(prisma.wallet.update).mockResolvedValueOnce({
      balanceCents: 4200,
    } as never);

    await creditWallet({
      userId: "u1",
      amountCents: -800,
      type: "TASK_REVERSAL",
    });

    const walletArg = vi.mocked(prisma.wallet.update).mock.calls[0][0];
    expect(walletArg?.data).toEqual({
      balanceCents: { increment: -800 },
      lifetimeEarningsCents: undefined,
    });
  });
});