"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Types (mirror the service shapes; we don't import them here
// so this client file has no server-side dependency)
// ─────────────────────────────────────────────────────────────

type Option = { id: string; label: string; order: number };

type Question = {
  id: string;
  type: string;
  prompt: string;
  points: number;
  order: number;
  metadata: unknown;
  options: Option[];
};

type Section = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  questions: Question[];
};

type Attempt = {
  id: string;
  assessmentId: string;
  assessmentName: string;
  assessmentSlug: string;
  status: string;
  startedAt: string;
  expiresAt: string | null;
  submittedAt: string | null;
  score: number | null;
  sections: Section[];
  answers: Record<string, unknown>;
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function formatRemaining(ms: number): string {
  if (ms <= 0) return "00:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function readSelectedOptionId(response: unknown): string | null {
  if (!response || typeof response !== "object") return null;
  const r = response as Record<string, unknown>;
  if (typeof r.optionId === "string") return r.optionId;
  return null;
}

// ─────────────────────────────────────────────────────────────
// TakeForm
// ─────────────────────────────────────────────────────────────

export function TakeForm({
  attempt,
  assessmentSlug,
}: {
  attempt: Attempt;
  assessmentSlug: string;
}) {
  const router = useRouter();

  // Flatten questions (order matches server)
  const allQuestions = useMemo<Question[]>(() => {
    const out: Question[] = [];
    for (const s of attempt.sections) {
      for (const q of s.questions) out.push(q);
    }
    return out;
  }, [attempt.sections]);

  // Local answer state, seeded from what the server already has
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const q of allQuestions) {
      const existing = readSelectedOptionId(attempt.answers[q.id]);
      if (existing) seed[q.id] = existing;
    }
    return seed;
  });

  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(() => {
    if (!attempt.expiresAt) return 0;
    return new Date(attempt.expiresAt).getTime() - Date.now();
  });

  // Timer
  useEffect(() => {
    if (!attempt.expiresAt) return;
    const id = setInterval(() => {
      setRemainingMs(new Date(attempt.expiresAt!).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [attempt.expiresAt]);

  // Auto-submit when timer hits zero (once)
  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (remainingMs <= 0 && !autoSubmitted.current && !submitting) {
      autoSubmitted.current = true;
      void handleSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs]);

  // Save answer on change
  async function handleSelect(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    setSaving((prev) => ({ ...prev, [questionId]: true }));

    try {
      const res = await fetch(`/api/attempts/${attempt.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          response: { optionId },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          (data as { error?: string }).error ?? "Failed to save your answer.",
        );
      }
    } catch {
      setError("Network error — your answer may not have been saved.");
    } finally {
      setSaving((prev) => ({ ...prev, [questionId]: false }));
    }
  }

  async function handleSubmit(auto = false) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/attempts/${attempt.id}/submit`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          (data as { error?: string }).error ?? "Failed to submit attempt.",
        );
        setSubmitting(false);
        return;
      }

      // Redirect to results page
      router.push(
        `/assessments/${assessmentSlug}/take/results?attemptId=${attempt.id}${auto ? "&auto=1" : ""}`,
      );
    } catch {
      setError("Network error — could not submit.");
      setSubmitting(false);
    }
  }

  const answeredCount = Object.keys(answers).length;
  const totalCount = allQuestions.length;
  const progressPct =
    totalCount === 0 ? 0 : Math.round((answeredCount / totalCount) * 100);

  const timerLow = remainingMs > 0 && remainingMs < 60_000;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Taking assessment
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {attempt.assessmentName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {answeredCount} of {totalCount} answered
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-mono",
              timerLow
                ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
                : "bg-muted/40",
            )}
          >
            <Clock className="h-4 w-4" />
            <span>{formatRemaining(remainingMs)}</span>
          </div>

          <Button
            onClick={() => void handleSubmit(false)}
            disabled={submitting}
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit assessment"
            )}
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Questions */}
      <div className="space-y-6">
        {attempt.sections.map((section) => (
          <div key={section.id} className="space-y-3">
            {section.title !== "General" || attempt.sections.length > 1 ? (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </h2>
                {section.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {section.description}
                  </p>
                ) : null}
              </div>
            ) : null}

            {section.questions.map((q, idx) => {
              const globalIdx = allQuestions.findIndex((x) => x.id === q.id);
              const selected = answers[q.id];
              const isSaving = saving[q.id];

              return (
                <Card key={q.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-start justify-between gap-4 text-base font-medium">
                      <span className="flex items-start gap-2">
                        <span className="text-muted-foreground">
                          {globalIdx + 1}.
                        </span>
                        <span className="whitespace-pre-wrap">{q.prompt}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-xs font-normal text-muted-foreground">
                        {isSaving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : selected ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        ) : null}
                        {q.points} pt{q.points === 1 ? "" : "s"}
                      </span>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-2">
                    {q.options
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((opt) => {
                        const isSelected = selected === opt.id;
                        return (
                          <label
                            key={opt.id}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "hover:bg-muted/40",
                            )}
                          >
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              value={opt.id}
                              checked={isSelected}
                              onChange={() => void handleSelect(q.id, opt.id)}
                              disabled={submitting}
                              className="h-4 w-4 accent-primary"
                            />
                            <span className="whitespace-pre-wrap">
                              {opt.label}
                            </span>
                          </label>
                        );
                      })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <p className="text-xs text-muted-foreground">
          Answers save automatically. You can close this tab and come back to
          resume.
        </p>
        <Button
          onClick={() => void handleSubmit(false)}
          disabled={submitting}
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting…
            </>
          ) : (
            "Submit assessment"
          )}
        </Button>
      </div>
    </div>
  );
}