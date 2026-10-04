import { prisma } from "@/lib/prisma";
import type {
  TransactionStatus,
  TransactionType,
} from "@prisma/client";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type WalletSummary = {
  balanceCents: number;
  pendingCents: number;
  lifetimeEarningsCents: number;
  totalWithdrawnCents: number;
  currency: string;
};

export type TransactionView = {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amountCents: number;
  currency: string;
  description: string | null;
  reference: string | null;
  createdAt: string;
};

export type WalletPageData = {
  summary: WalletSummary;
  recentTransactions: TransactionView[];
};

export type CreditWalletInput = {
  userId: string;
  amountCents: number;
  type: TransactionType;
  description?: string | null;
  reference?: string | null;
  taskId?: string | null;
  submissionId?: string | null;
  createdById?: string | null;
  status?: TransactionStatus;
};

export type CreditWalletResult =
  | { ok: true; transactionId: string; newBalanceCents: number }
  | { ok: false; reason: "INVALID_AMOUNT" };

// ─────────────────────────────────────────────────────────────
// getWalletForUser
// ─────────────────────────────────────────────────────────────

export async function getWalletForUser(
  userId: string,
): Promise<WalletPageData> {
  const [wallet, transactions] = await Promise.all([
    prisma.wallet.findUnique({
      where: { userId },
      select: {
        balanceCents: true,
        pendingCents: true,
        lifetimeEarningsCents: true,
        totalWithdrawnCents: true,
        currency: true,
      },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        status: true,
        amountCents: true,
        currency: true,
        description: true,
        reference: true,
        createdAt: true,
      },
    }),
  ]);

  const summary: WalletSummary = wallet
    ? {
        balanceCents: wallet.balanceCents,
        pendingCents: wallet.pendingCents,
        lifetimeEarningsCents: wallet.lifetimeEarningsCents,
        totalWithdrawnCents: wallet.totalWithdrawnCents,
        currency: wallet.currency,
      }
    : {
        balanceCents: 0,
        pendingCents: 0,
        lifetimeEarningsCents: 0,
        totalWithdrawnCents: 0,
        currency: "USD",
      };

  const recentTransactions: TransactionView[] = transactions.map((t) => ({
    id: t.id,
    type: t.type,
    status: t.status,
    amountCents: t.amountCents,
    currency: t.currency,
    description: t.description,
    reference: t.reference,
    createdAt: t.createdAt.toISOString(),
  }));

  return { summary, recentTransactions };
}

// ─────────────────────────────────────────────────────────────
// creditWallet
//
// The single entry point for money coming IN. Creates a
// Transaction row and updates the wallet balance + lifetime
// earnings. Runs both in a transaction so a partial write
// can't leave the ledger out of sync.
//
// Positive amountCents only. To reverse an earning, pass a
// negative amount with type TASK_REVERSAL — the ledger
// treats reversals explicitly.
// ─────────────────────────────────────────────────────────────

export async function creditWallet(
  input: CreditWalletInput,
): Promise<CreditWalletResult> {
  if (!Number.isInteger(input.amountCents) || input.amountCents === 0) {
    return { ok: false, reason: "INVALID_AMOUNT" };
  }

  const wallet = await prisma.wallet.findUnique({
    where: { userId: input.userId },
    select: { id: true, currency: true },
  });

  const currency = wallet?.currency ?? "USD";
  const isPositive = input.amountCents > 0;

  const transaction = await prisma.$transaction(async (tx) => {
    // Ensure the wallet exists
    const ensured = wallet
      ? wallet
      : await tx.wallet.create({
          data: { userId: input.userId, currency },
          select: { id: true, currency: true },
        });

    const createdTx = await tx.transaction.create({
      data: {
        userId: input.userId,
        type: input.type,
        status: input.status ?? "APPROVED",
        amountCents: input.amountCents,
        currency,
        description: input.description ?? null,
        reference: input.reference ?? null,
        taskId: input.taskId ?? null,
        submissionId: input.submissionId ?? null,
        createdById: input.createdById ?? null,
      },
      select: { id: true },
    });

    const updated = await tx.wallet.update({
      where: { id: ensured.id },
      data: {
        balanceCents: { increment: input.amountCents },
        lifetimeEarningsCents: isPositive
          ? { increment: input.amountCents }
          : undefined,
      },
      select: { balanceCents: true },
    });

    return {
      transactionId: createdTx.id,
      newBalanceCents: updated.balanceCents,
    };
  });

  return {
    ok: true,
    transactionId: transaction.transactionId,
    newBalanceCents: transaction.newBalanceCents,
  };
}

// ─────────────────────────────────────────────────────────────
// computePaymentCents
//
// Quality-gated flat rate:
//   base = ratePerHourCents / 60 * estimatedMinutes
//   pay  = base if qualityScore >= qualityThreshold
//   pay  = 0    otherwise
// Runs as a pure function so it can be unit tested.
// ─────────────────────────────────────────────────────────────

export function computePaymentCents(input: {
  ratePerHourCents: number | null;
  estimatedMinutes: number | null;
  qualityScore: number | null;
  qualityThreshold: number;
}): number {
  const { ratePerHourCents, estimatedMinutes, qualityScore, qualityThreshold } =
    input;

  if (
    ratePerHourCents === null ||
    estimatedMinutes === null ||
    estimatedMinutes <= 0
  ) {
    return 0;
  }

  if (qualityScore === null || qualityScore < qualityThreshold) {
    return 0;
  }

  return Math.round((ratePerHourCents / 60) * estimatedMinutes);
}