import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, Coins } from "lucide-react";

import { requireUser } from "@/server/auth/guards";
import { prisma } from "@/lib/prisma";
import { acceptTask } from "@/server/services/task-assignment.service";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { TaskForm } from "./task-form";

export const metadata: Metadata = {
  title: "Task",
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

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const acceptResult = await acceptTask(id, user.id);

  if (!acceptResult.ok) {
    if (acceptResult.reason === "TASK_NOT_FOUND") notFound();
    if (acceptResult.reason === "NOT_QUALIFIED") {
      redirect("/tasks?reason=not-qualified");
    }
    if (acceptResult.reason === "TASK_FULL") {
      redirect("/tasks?reason=task-full");
    }
    if (acceptResult.reason === "TASK_NOT_AVAILABLE") {
      redirect("/tasks?reason=not-available");
    }
    if (acceptResult.reason === "PROJECT_NOT_ACTIVE") {
      redirect("/tasks?reason=project-inactive");
    }
    notFound();
  }

  const assignment = acceptResult.assignment;

  const task = await prisma.task.findFirst({
    where: { id },
    select: {
      id: true,
      title: true,
      instructions: true,
      content: true,
      difficulty: true,
      estimatedMinutes: true,
      ratePerHourCents: true,
      project: {
        select: { name: true, currency: true },
      },
      submissions: {
        where: { userId: user.id },
        orderBy: { submittedAt: "desc" },
        take: 1,
        select: {
          id: true,
          submittedAt: true,
          qualityScore: true,
          isCorrect: true,
          response: true,
        },
      },
    },
  });

  if (!task) notFound();

  const lastSubmission = task.submissions[0] ?? null;
  const alreadySubmitted =
    assignment.status === "SUBMITTED" || assignment.status === "COMPLETED";
  const isReadOnly = alreadySubmitted || assignment.status === "EXPIRED";

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2" asChild>
          <Link href="/tasks">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            All tasks
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {task.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">{task.project.name}</span>
            <span className="text-muted-foreground">·</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                DIFFICULTY_CLASS[task.difficulty] ??
                "bg-muted text-muted-foreground"
              }`}
            >
              {DIFFICULTY_LABEL[task.difficulty] ?? task.difficulty}
            </span>
          </div>
        </div>

        {alreadySubmitted ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Submitted
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {task.estimatedMinutes !== null ? (
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />~{task.estimatedMinutes} min
          </span>
        ) : null}
        {task.ratePerHourCents !== null ? (
          <span className="flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5" />
            {formatCurrency(task.ratePerHourCents)}/hr
          </span>
        ) : null}
      </div>

      {task.instructions ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {task.instructions}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Task content</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskContent content={task.content} />
        </CardContent>
      </Card>

      {isReadOnly ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your submission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lastSubmission ? (
              <>
                <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs">
                  {JSON.stringify(lastSubmission.response, null, 2)}
                </pre>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span>
                    Submitted{" "}
                    {new Date(lastSubmission.submittedAt).toLocaleString()}
                  </span>
                  {lastSubmission.qualityScore !== null ? (
                    <span>Quality score: {lastSubmission.qualityScore}</span>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No submission found for this task.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <TaskForm
          assignmentId={assignment.id}
          taskId={task.id}
          taskTitle={task.title}
        />
      )}
    </div>
  );
}

function TaskContent({ content }: { content: unknown }) {
  if (!content || typeof content !== "object") {
    return (
      <p className="text-sm text-muted-foreground">
        No content attached to this task.
      </p>
    );
  }

  const c = content as Record<string, unknown>;

  if (typeof c.review === "string") {
    return (
      <blockquote className="border-l-2 border-primary/40 pl-4 text-sm italic">
        {c.review}
      </blockquote>
    );
  }

  if (typeof c.question === "string" && typeof c.reasoning === "string") {
    return (
      <div className="space-y-3 text-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Question
          </p>
          <p className="mt-1 whitespace-pre-wrap">{c.question}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Model reasoning
          </p>
          <pre className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-xs">
            {c.reasoning}
          </pre>
        </div>
      </div>
    );
  }

  if (typeof c.text === "string") {
    return <p className="whitespace-pre-wrap text-sm">{c.text}</p>;
  }

  return (
    <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs">
      {JSON.stringify(content, null, 2)}
    </pre>
  );
}