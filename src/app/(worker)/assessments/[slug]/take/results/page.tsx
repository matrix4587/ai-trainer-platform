import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Trophy,
  XCircle,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/guards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Assessment results",
};

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ attemptId?: string; auto?: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;
  const { attemptId, auto } = await searchParams;

  if (!attemptId) notFound();

  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { id: attemptId, userId: user.id },
    include: {
      assessment: {
        select: {
          name: true,
          slug: true,
          passingScore: true,
        },
      },
    },
  });

  if (!attempt || attempt.assessment.slug !== slug) notFound();

  const passed =
    attempt.score !== null && attempt.score >= attempt.assessment.passingScore;

  // Fetch capability history rows triggered by this attempt
  const grants = await prisma.capabilityHistory.findMany({
    where: {
      userId: user.id,
      reason: { contains: attempt.id },
    },
    orderBy: { createdAt: "desc" },
  });

  // Load the matching capability names in one query
  const capabilityIds = Array.from(new Set(grants.map((g) => g.capabilityId)));
  const capabilities =
    capabilityIds.length > 0
      ? await prisma.capability.findMany({
          where: { id: { in: capabilityIds } },
          select: { id: true, name: true },
        })
      : [];

  const nameById = new Map(capabilities.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <Link
        href={`/assessments/${slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to assessment
      </Link>

      {/* Big result card */}
      <Card>
        <CardContent className="py-10">
          <div className="mx-auto max-w-lg text-center">
            {passed ? (
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
            ) : (
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                <XCircle className="h-8 w-8" />
              </div>
            )}

            <h1 className="mt-4 text-2xl font-semibold tracking-tight">
              {passed ? "You passed!" : "Not quite this time"}
            </h1>

            {auto ? (
              <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                Time expired — your attempt was submitted automatically.
              </p>
            ) : null}

            <p className="mt-2 text-sm text-muted-foreground">
              {attempt.assessment.name}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-md border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Your score
                </p>
                <p className="mt-1 text-3xl font-bold">
                  {attempt.score !== null ? Math.round(attempt.score) : "—"}
                </p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Passing score
                </p>
                <p className="mt-1 text-3xl font-bold">
                  {attempt.assessment.passingScore}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="outline" asChild>
                <Link href="/assessments">
                  All assessments
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/capabilities">
                  View capabilities
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capabilities earned */}
      {grants.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4" />
              Capabilities earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {grants.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span className="font-medium">
                    {nameById.get(g.capabilityId) ?? "Capability"}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {g.newLevel}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}