import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  Target,
} from "lucide-react";

import { requireUser } from "@/server/auth/guards";
import { listAssessmentsForUser } from "@/server/services/assessment.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Assessments",
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

function statusLabel(item: {
  attemptsUsed: number;
  attemptsRemaining: number;
  lastAttemptStatus: string | null;
  lastAttemptScore: number | null;
}): { text: string; tone: "neutral" | "success" | "warn" } {
  if (item.attemptsUsed === 0) {
    return { text: "Not started", tone: "neutral" };
  }
  if (item.lastAttemptStatus === "GRADED" && item.lastAttemptScore !== null) {
    if (item.attemptsRemaining > 0) {
      return {
        text: `Last score ${Math.round(item.lastAttemptScore)} · ${item.attemptsRemaining} attempt${item.attemptsRemaining === 1 ? "" : "s"} left`,
        tone: "success",
      };
    }
    return {
      text: `Completed · score ${Math.round(item.lastAttemptScore)}`,
      tone: "success",
    };
  }
  if (item.lastAttemptStatus === "IN_PROGRESS") {
    return { text: "In progress", tone: "warn" };
  }
  return { text: "Attempted", tone: "neutral" };
}

export default async function AssessmentsPage() {
  const user = await requireUser();
  const items = await listAssessmentsForUser(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assessments</h1>
        <p className="text-sm text-muted-foreground">
          Pass assessments to earn capabilities. Capabilities unlock paid
          tasks.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <BookOpenCheck className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-base font-semibold">
                No assessments available
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Check back later. New assessments are added regularly.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((a) => {
            const status = statusLabel(a);
            const exhausted = a.attemptsRemaining === 0;

            return (
              <Card key={a.id} className="flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base leading-tight">
                      {a.name}
                    </CardTitle>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {a.category}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      DIFFICULTY_CLASS[a.difficulty] ??
                      "bg-muted text-muted-foreground"
                    }`}
                  >
                    {DIFFICULTY_LABEL[a.difficulty] ?? a.difficulty}
                  </span>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col justify-between gap-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {a.description ?? "No description provided."}
                  </p>

                  <dl className="grid grid-cols-3 gap-3 border-t pt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <BookOpenCheck className="h-3.5 w-3.5" />
                      <span>{a.questionCount} Qs</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{a.timeLimitMinutes} min</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5" />
                      <span>Pass {a.passingScore}</span>
                    </div>
                  </dl>

                  <div className="flex items-center gap-2 text-xs">
                    {status.tone === "success" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : null}
                    <span
                      className={
                        status.tone === "success"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : status.tone === "warn"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                      }
                    >
                      {status.text}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant={exhausted ? "outline" : "default"}
                    className="w-full"
                    asChild
                  >
                    <Link href={`/assessments/${a.slug}`}>
                      {exhausted
                        ? "View details"
                        : a.attemptsUsed === 0
                          ? "Start assessment"
                          : "Continue"}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}