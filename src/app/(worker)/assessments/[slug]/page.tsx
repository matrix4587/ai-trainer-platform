import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  RotateCcw,
  Target,
} from "lucide-react";

import { requireUser } from "@/server/auth/guards";
import { getAssessmentBySlug } from "@/server/services/assessment.service";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Assessment",
};

const DIFFICULTY_LABEL: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
};

const DIFFICULTY_CLASS: Record<string, string> = {
  BEGINNER: "bg-muted text-muted-foreground",
  INTERMEDIATE: "bg-primary/10 text-primary",
  ADVANCED: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  EXPERT: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;

  const assessment = await getAssessmentBySlug(slug, user.id);
  if (!assessment) notFound();

  // Past attempts, newest first (to show history)
  const attempts = await prisma.assessmentAttempt.findMany({
    where: {
      userId: user.id,
      assessmentId: assessment.id,
      status: { not: "ABANDONED" },
    },
    orderBy: { startedAt: "desc" },
    take: 5,
    select: {
      id: true,
      status: true,
      score: true,
      startedAt: true,
      submittedAt: true,
    },
  });

  const exhausted = assessment.attemptsRemaining === 0;
  const hasInProgress = attempts.some((a) => a.status === "IN_PROGRESS");

  const primaryHref = `/assessments/${assessment.slug}/take`;
  const primaryLabel = hasInProgress
    ? "Resume attempt"
    : exhausted
      ? "No attempts left"
      : "Start assessment";

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Button variant="ghost" size="sm" className="-ml-2" asChild>
          <Link href="/assessments">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            All assessments
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {assessment.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {assessment.category}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                DIFFICULTY_CLASS[assessment.difficulty] ??
                "bg-muted text-muted-foreground"
              }`}
            >
              {DIFFICULTY_LABEL[assessment.difficulty] ?? assessment.difficulty}
            </span>
          </div>
          {assessment.description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {assessment.description}
            </p>
          ) : null}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Questions
            </CardTitle>
            <BookOpenCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assessment.questionCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Time limit
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assessment.timeLimitMinutes} min
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Passing score
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assessment.passingScore}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Attempts left
            </CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assessment.attemptsRemaining}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              of {assessment.maxAttempts} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Call to action */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
          <div>
            <p className="text-sm font-medium">
              {exhausted
                ? "You've used all your attempts for this assessment."
                : hasInProgress
                  ? "You have an attempt in progress."
                  : "Ready to take this assessment?"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {exhausted
                ? "Contact support if you believe this is a mistake."
                : "Make sure you have enough time before you start — the timer begins when you click."}
            </p>
          </div>
          <Button disabled={exhausted} asChild={!exhausted}>
            {exhausted ? (
              <span>{primaryLabel}</span>
            ) : (
              <Link href={primaryHref}>
                {primaryLabel}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Attempt history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your attempts</CardTitle>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You haven&apos;t attempted this assessment yet.
            </p>
          ) : (
            <ul className="divide-y">
              {attempts.map((a) => {
                const started = new Date(a.startedAt).toLocaleString();
                const passed =
                  a.status === "GRADED" &&
                  a.score !== null &&
                  a.score >= assessment.passingScore;

                return (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {a.status === "GRADED" && passed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : null}
                      <span className="font-medium">{a.status}</span>
                      <span className="text-muted-foreground">· {started}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {a.score !== null ? (
                        <span
                          className={
                            passed
                              ? "text-emerald-600 dark:text-emerald-400 font-medium"
                              : ""
                          }
                        >
                          Score {Math.round(a.score)}
                        </span>
                      ) : (
                        <span>—</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}