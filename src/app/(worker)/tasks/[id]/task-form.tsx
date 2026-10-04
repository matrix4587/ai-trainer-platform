"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TaskForm({
  assignmentId,
  taskId,
  taskTitle,
}: {
  assignmentId: string;
  taskId: string;
  taskTitle: string;
}) {
  const router = useRouter();

  const [answer, setAnswer] = useState("");
  const [comment, setComment] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (submitting) return;
    if (!answer.trim()) {
      setError("Please write an answer before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/assignments/${assignmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response: { text: answer.trim() },
          confidence,
          comment: comment.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(data.error ?? "Failed to submit your answer.");
        setSubmitting(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Network error — could not submit.");
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your answer</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="answer"
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Response
          </label>
          <textarea
            id="answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={submitting}
            rows={6}
            placeholder="Type your response here…"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <p className="text-xs text-muted-foreground">
            Be specific. Your submission is scored for quality.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Confidence in your answer (optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 0.25, label: "Low" },
              { value: 0.5, label: "Medium" },
              { value: 0.75, label: "High" },
              { value: 1.0, label: "Very high" },
            ].map((opt) => {
              const selected = confidence === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setConfidence(selected ? null : opt.value)}
                  disabled={submitting}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="comment"
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Comment (optional)
          </label>
          <input
            id="comment"
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={submitting}
            maxLength={2000}
            placeholder="Anything the reviewer should know?"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <Button
            type="button"
            size="lg"
            disabled={submitting || !answer.trim()}
            onClick={() => void handleSubmit()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit task
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}