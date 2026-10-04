import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowRight,
  Coins,
  DollarSign,
  TrendingUp,
  Wallet as WalletIcon,
} from "lucide-react";

import { requireUser } from "@/server/auth/guards";
import {
  getWalletForUser,
  type TransactionView,
} from "@/server/services/wallet.service";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Wallet",
};

const TX_LABEL: Record<string, string> = {
  TASK_EARNING: "Task earning",
  TASK_REVERSAL: "Task reversal",
  BONUS: "Bonus",
  ADJUSTMENT: "Adjustment",
  WITHDRAWAL: "Withdrawal",
  WITHDRAWAL_REFUND: "Withdrawal refund",
  REVIEW_EARNING: "Review earning",
  REFERRAL_BONUS: "Referral bonus",
};

const TX_STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  APPROVED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  REJECTED: "bg-red-500/10 text-red-600 dark:text-red-400",
  REVERSED: "bg-muted text-muted-foreground",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function TxRow({ tx }: { tx: TransactionView }) {
  const isNegative = tx.amountCents < 0;
  const label = TX_LABEL[tx.type] ?? tx.type;
  const statusClass =
    TX_STATUS_CLASS[tx.status] ?? "bg-muted text-muted-foreground";

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
      <div className="min-w-0 space-y-0.5">
        <p className="font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">
          {tx.description ?? "—"} · {formatDate(tx.createdAt)}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}
        >
          {tx.status}
        </span>
        <span
          className={`font-mono text-sm font-medium ${
            isNegative ? "text-red-600 dark:text-red-400" : ""
          }`}
        >
          {isNegative ? "−" : "+"}
          {formatCurrency(Math.abs(tx.amountCents))}
        </span>
      </div>
    </li>
  );
}

export default async function WalletPage() {
  const user = await requireUser();
  const { summary, recentTransactions } = await getWalletForUser(user.id);

  const stats = [
    {
      label: "Available balance",
      value: formatCurrency(summary.balanceCents),
      icon: WalletIcon,
      hint: "Withdrawable now",
    },
    {
      label: "Pending",
      value: formatCurrency(summary.pendingCents),
      icon: Coins,
      hint: "Awaiting review",
    },
    {
      label: "Lifetime earnings",
      value: formatCurrency(summary.lifetimeEarningsCents),
      icon: TrendingUp,
      hint: "All-time",
    },
    {
      label: "Total withdrawn",
      value: formatCurrency(summary.totalWithdrawnCents),
      icon: ArrowDownToLine,
      hint: "All payouts",
    },
  ];

  const canWithdraw = summary.balanceCents > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Wallet</h1>
          <p className="text-sm text-muted-foreground">
            Your earnings, current balance, and withdrawal history.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/withdrawals">
            <ArrowDownToLine className="mr-1.5 h-4 w-4" />
            Withdraw funds
          </Link>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {s.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* CTA banner */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {canWithdraw
                  ? `You have ${formatCurrency(summary.balanceCents)} available to withdraw.`
                  : "No balance available yet."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {canWithdraw
                  ? "Withdrawals are processed every Friday."
                  : "Complete approved tasks to start earning."}
              </p>
            </div>
          </div>
          <Button disabled={!canWithdraw} asChild={canWithdraw}>
            {canWithdraw ? (
              <Link href="/withdrawals">
                Request withdrawal
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            ) : (
              <span>Request withdrawal</span>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="rounded-md border border-dashed py-10 text-center">
              <Coins className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No transactions yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Earnings from approved tasks will appear here.
              </p>
              <Button size="sm" className="mt-4" asChild>
                <Link href="/tasks">
                  Browse tasks
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {recentTransactions.map((tx) => (
                <TxRow key={tx.id} tx={tx} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}