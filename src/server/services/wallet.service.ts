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

// ─────────────────────────────────────────────────────────────
// getWalletForUser
//
// Returns a wallet summary + recent transactions. If the user
// has no wallet yet (never had a transaction), returns zeros
// instead of null so the UI can render an empty state cleanly.
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