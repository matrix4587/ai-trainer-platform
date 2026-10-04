import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  Clock,
  ClipboardList,
  Coins,
  History,
} from "lucide-react";

import { requireUser } from "@/server/auth/guards";
import {
  listAvailableTasksForUser,
  listMyAssignmentSummaries,
} from "@/server/services/task.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Tasks",
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
  OFFERED: "Offered",
  ACCEPTED: "Accepted",
  STARTED: "In progress",
  PAUSED: "Paused",
  SUBMITTED: "Submitted",
  COMPLETED: "Completed",
  ABANDONED: "Abandoned",
  EXPIRED: "Expired",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function TasksPage() {
  const user = await requireUser();

  const [availableResult, myAssignments] = await Promise.all([
    listAvailableTasksForUser(user.id),
    listMyAssignmentSummaries(user.id),
  ]);

  const available = availableResult.ok ? availableResult.tasks : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground">
          Paid work you qualify for, based on the capabilities you&apos;ve
          earned.
        </p>
      </div>

      {/* My assignments */}
      {myAssignments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              Your assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {myAssignments.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{a.taskTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.projectName} · {STATUS_LABEL[a.status] ?? a.status} ·
                      Assigned {formatDate(a.assignedAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {a.qualityScore !== null ? (
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        Score {Math.round(a.qualityScore)}
                      </span>
                    ) : null}
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/tasks/${a.taskId}`}>
                        {a.status === "ACCEPTED" || a.status === "STARTED"
                          ? "Continue"
                          : "View"}
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* Available tasks */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Available tasks
        </h2>

        {available.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="mx-auto max-w-md text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-semibold">
                  No tasks available
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pass more assessments to unlock more tasks. Tasks appear here
                  automatically once you qualify.
                </p>
                <Button className="mt-6" asChild>
                  <Link href="/assessments">
                    Browse assessments
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {available.map((t) => (
              <Card key={t.id} className="flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base leading-tight">
                      {t.title}
                    </CardTitle>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t.project.name}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      DIFFICULTY_CLASS[t.difficulty] ??
                      "bg-muted text-muted-foreground"
                    }`}
                  >
                    {DIFFICULTY_LABEL[t.difficulty] ?? t.difficulty}
                  </span>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col justify-between gap-4">
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {t.instructions ?? "No instructions provided."}
                  </p>

                  <dl className="grid grid-cols-2 gap-3 border-t pt-3 text-xs text-muted-foreground">
                    {t.estimatedMinutes !== null ? (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>~{t.estimatedMinutes} min</span>
                      </div>
                    ) : null}
                    {t.ratePerHourCents !== null ? (
                      <div className="flex items-center gap-1.5">
                        <Coins className="h-3.5 w-3.5" />
                        <span>{formatCurrency(t.ratePerHourCents)}/hr</span>
                      </div>
                    ) : null}
                  </dl>

                  {t.requirements.length > 0 ? (
                    <div className="space-y-1.5 text-xs">
                      <p className="text-muted-foreground">Requires:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {t.requirements.map((r) => (
                          <span
                            key={r.capabilityId}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary"
                          >
                            <Award className="h-3 w-3" />
                            {r.capabilityName} · {r.minLevel}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <Button size="sm" className="w-full" asChild>
                    <Link href={`/tasks/${t.id}`}>
                      Start task
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}