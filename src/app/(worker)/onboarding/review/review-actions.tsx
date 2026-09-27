"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ReviewActions({
  completion,
  alreadyDone,
}: {
  completion: number;
  alreadyDone: boolean;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFinish() {
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/profile/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to finish. Please try again.");
        setSubmitting(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border bg-background p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium">
            {alreadyDone
              ? "Onboarding already completed"
              : "Ready to finish?"}
          </p>
          <p className="text-xs text-muted-foreground">
            {alreadyDone
              ? "You can still edit any section above."
              : `Current completion: ${completion}%. Clicking finish will unlock your dashboard.`}
          </p>
        </div>

        <Button onClick={handleFinish} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Finishing...
            </>
          ) : alreadyDone ? (
            "Go to dashboard"
          ) : (
            "Finish onboarding"
          )}
        </Button>
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}