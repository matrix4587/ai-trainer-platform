import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpenCheck,
  ClipboardList,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/guards";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await requireUser();

  // Gate: users who haven't finished onboarding get sent back to the wizard
  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { onboardingCompletedAt: true },
  });

  if (!profile?.onboardingCompletedAt) {
    redirect("/onboarding/review");
  }

  // Pull live data from the DB
  const [wallet, capabilities, pendingTasks] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId: user.id } }),
    prisma.userCapability.findMany({
      where: { userId: user.id },
      include: { capability: true },
      orderBy: { grantedAt: "desc" },
      take: 5,
    }),
    prisma.taskAssignment.count({
      where: {
        userId: user.id,
        status: { in: ["OFFERED", "ACCEPTED", "STARTED"] },
      },
    }),
  ]);

  const stats = [
    {
      label: "Available balance",
      value: formatCurrency(wallet?.balanceCents ?? 0),
      icon: Wallet,
      hint: "Withdraw every Friday",
    },
    {
      label: "Available tasks",
      value: String(pendingTasks),
      icon: ClipboardList,
      hint:
        pendingTasks === 0
          ? "Complete assessments to unlock"
          : "Ready to work",
    },
    {
      label: "Capabilities",
      value: String(capabilities.length),
      icon: Sparkles,
      hint:
        capabilities.length === 0
          ? "Take your first assessment"
          : "Active",
    },
    {
      label: "Lifetime earnings",
      value: formatCurrency(wallet?.lifetimeEarningsCents ?? 0),
      icon: TrendingUp,
      hint: "All-time",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your live snapshot — tasks, capabilities, and earnings.
        </p>
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

      {/* Capabilities + Recommended */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Capabilities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your capabilities</CardTitle>
          </CardHeader>
          <CardContent>
            {capabilities.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center">
                <BookOpenCheck className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">
                  No capabilities yet
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Complete your first assessment to unlock paid tasks.
                </p>
                <Button size="sm" className="mt-4" asChild>
                  <Link href="/assessments">
                    View assessments
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {capabilities.map((uc: any) => (
                  <li
                    key={uc.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{uc.capability.name}</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {uc.level}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recommended tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommended tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-dashed p-6 text-center">
              <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">
                No tasks available yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tasks unlock automatically once you qualify through assessments.
              </p>
              <Button size="sm" variant="outline" className="mt-4" asChild>
                <Link href="/assessments">
                  Take an assessment
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}