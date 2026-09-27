"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type Fluency = "BASIC" | "CONVERSATIONAL" | "PROFESSIONAL" | "FLUENT" | "NATIVE";

type Language = { id: string; name: string; code: string };

type Selection = {
  languageId: string;
  fluency: Fluency;
  isNative: boolean;
};

const FLUENCY_OPTIONS: { value: Fluency; label: string }[] = [
  { value: "BASIC", label: "Basic" },
  { value: "CONVERSATIONAL", label: "Conversational" },
  { value: "PROFESSIONAL", label: "Professional" },
  { value: "FLUENT", label: "Fluent" },
  { value: "NATIVE", label: "Native" },
];

export function LanguagesForm({
  allLanguages,
  initialSelections,
}: {
  allLanguages: Language[];
  initialSelections: Selection[];
}) {
  const router = useRouter();
  const [selections, setSelections] = useState<Selection[]>(
    initialSelections.length > 0
      ? initialSelections
      : [{ languageId: "", fluency: "FLUENT", isNative: false }],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addRow() {
    setSelections((prev) => [
      ...prev,
      { languageId: "", fluency: "FLUENT", isNative: false },
    ]);
  }

  function removeRow(index: number) {
    setSelections((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRow(index: number, patch: Partial<Selection>) {
    setSelections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const valid = selections.filter((s) => s.languageId);
    if (valid.length === 0) {
      setError("Please select at least one language.");
      return;
    }

    // Reject duplicates
    const ids = valid.map((s) => s.languageId);
    if (new Set(ids).size !== ids.length) {
      setError("You've selected the same language twice.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/profile/languages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          languages: valid.map((s) => ({
            languageId: s.languageId,
            fluency: s.fluency,
            isNative: s.isNative,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to save. Please try again.");
        setSubmitting(false);
        return;
      }

      router.push("/onboarding/resume");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  const selectClass =
    "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {selections.map((selection, index) => (
        <div
          key={index}
          className="rounded-lg border bg-muted/10 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Language #{index + 1}</p>
            {selections.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="text-destructive hover:opacity-70"
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium leading-6">
                Language *
              </label>
              <select
                required
                value={selection.languageId}
                onChange={(e) =>
                  updateRow(index, { languageId: e.target.value })
                }
                className={`${selectClass} mt-1`}
              >
                <option value="">Select a language…</option>
                {allLanguages.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium leading-6">
                Fluency *
              </label>
              <select
                required
                value={selection.fluency}
                onChange={(e) =>
                  updateRow(index, {
                    fluency: e.target.value as Fluency,
                  })
                }
                className={`${selectClass} mt-1`}
              >
                {FLUENCY_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selection.isNative}
              onChange={(e) =>
                updateRow(index, { isNative: e.target.checked })
              }
              className="h-4 w-4 rounded border-input accent-primary"
            />
            This is my native language
          </label>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addRow}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add another language
      </Button>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save & continue"
          )}
        </Button>
      </div>
    </form>
  );
}