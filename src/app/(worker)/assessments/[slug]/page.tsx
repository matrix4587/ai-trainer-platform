import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  History,
  Target,
  Trophy,
  XCircle,
} from "lucide-react";

import { requireUser } from "@/server/auth/guards";
import {
  getAssessmentBySlug,
  getAssessmentAttemptsForUser,
} from "@/server/services/assessment.service";
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

const STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  GRADING: "Grading",
  GRADED: "Graded",
  EXPIRED: "Expired",
  ABANDONED: "Abandoned",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;

  const assessment = await getAssessmentBySlug(slug, user.id);
  if (!assessment) notFound();

  const attempts = await getAssessmentAttemptsForUser(slug, user.id);

  const inProgress = attempts.find((a) => a.status === "IN_PROGRESS");
  const exhausted = assessment.attemptsRemaining === 0;
  const canStart = !exhausted || !!inProgress;

  const buttonLabel = inProgress
    ? "Resume attempt"
    : exhausted
      ? "No attempts remaining"
      : assessment.attemptsUsed === 0
        ? "Start assessment"
        : "Take another attempt";

  return (
    <div className="space-y-6">
      <Link
        href="/assessments"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All assessments
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {assessment.name}
            </h1>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                DIFFICULTY_CLASS[assessment.difficulty] ??
                "bg-muted text-muted-foreground"
              }`}
            >
              {DIFFICULTY_LABEL[assessment.difficulty] ?? assessment.difficulty}
            </span>
          </div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {assessment.category}
          </p>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {assessment.description ?? "No description provided."}
          </p>
        </div>

        {canStart ? (
          <Button size="lg" asChild>
            <Link href={`/assessments/${assessment.slug}/take`}>
              {buttonLabel}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button size="lg" disabled>
            {buttonLabel}
          </Button>
        )}
      </div>

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
              {assessment.timeLimitMinutes}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                min
              </span>
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
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assessment.attemptsRemaining}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                / {assessment.maxAttempts}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            What you&apos;ll be assessed on
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
              {assessment.questionCount} question
              {assessment.questionCount === 1 ? "" : "s"} covering{" "}
              {assessment.category.toLowerCase()}.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
              You must complete it within {assessment.timeLimitMinutes}{" "}
              minutes.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
              Score {assessment.passingScore} or higher to earn a capability.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
              You have {assessment.maxAttempts} attempt
              {assessment.maxAttempts === 1 ? "" : "s"} in total for this
              assessment.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Your attempts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No attempts yet. Click <strong>Start assessment</strong> to begin.
            </p>
          ) : (
            <ul className="divide-y">
              {attempts.map((a) => {
                const passed =
                  a.status === "GRADED" &&
                  a.score !== null &&
                  a.score >= assessment.passingScore;

                return (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {passed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : a.status === "GRADED" ? (
                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Score {a.score !== null ? Math.round(a.score) : "—"}
                      </span>
                      <span>{formatDate(a.startedAt)}</span>
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