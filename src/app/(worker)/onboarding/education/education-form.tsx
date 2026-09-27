"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type EducationEntry = {
  id?: string;
  institution: string;
  degree: string;
  field: string;
  level: "HIGH_SCHOOL" | "BACHELORS" | "MASTERS" | "PHD" | "OTHER";
  startYear: number | "";
  endYear: number | "";
};

const LEVELS = [
  { value: "HIGH_SCHOOL", label: "High School" },
  { value: "BACHELORS", label: "Bachelors" },
  { value: "MASTERS", label: "Masters" },
  { value: "PHD", label: "PhD" },
  { value: "OTHER", label: "Other" },
] as const;

export function EducationForm({
  initialEntries,
}: {
  initialEntries: EducationEntry[];
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<EducationEntry[]>(
    initialEntries.length > 0 ? initialEntries : [emptyEntry()],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function emptyEntry(): EducationEntry {
    return {
      institution: "",
      degree: "",
      field: "",
      level: "BACHELORS",
      startYear: "",
      endYear: "",
    };
  }

  function updateEntry(index: number, patch: Partial<EducationEntry>) {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    );
  }

  function addEntry() {
    setEntries((prev) => [...prev, emptyEntry()]);
  }

  async function removeEntry(index: number) {
    const entry = entries[index];
    if (entry.id) {
      // Delete on the server
      try {
        await fetch(`/api/profile/education/${entry.id}`, { method: "DELETE" });
      } catch {
        // Non-blocking — we'll re-save the rest anyway
      }
    }
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Validate at least one entry is filled
    const validEntries = entries.filter(
      (e) => e.institution.trim() && e.degree.trim() && e.field.trim(),
    );
    if (validEntries.length === 0) {
      setError("Please fill in at least one education entry.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/profile/education", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: validEntries }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to save. Please try again.");
        setSubmitting(false);
        return;
      }

      router.push("/onboarding/experience");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  const inputClass =
    "mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {entries.map((entry, index) => (
        <div
          key={index}
          className="relative space-y-4 rounded-lg border bg-muted/10 p-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Education #{index + 1}
            </p>
            {entries.length > 1 && (
              <button
                type="button"
                onClick={() => removeEntry(index)}
                className="text-destructive hover:opacity-70"
                aria-label="Remove entry"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium leading-6">
                Institution *
              </label>
              <input
                type="text"
                required
                value={entry.institution}
                onChange={(e) =>
                  updateEntry(index, { institution: e.target.value })
                }
                className={inputClass}
                placeholder="University of Nairobi"
              />
            </div>

            <div>
              <label className="block text-sm font-medium leading-6">
                Degree *
              </label>
              <input
                type="text"
                required
                value={entry.degree}
                onChange={(e) => updateEntry(index, { degree: e.target.value })}
                className={inputClass}
                placeholder="BSc"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium leading-6">
                Field of study *
              </label>
              <input
                type="text"
                required
                value={entry.field}
                onChange={(e) => updateEntry(index, { field: e.target.value })}
                className={inputClass}
                placeholder="Computer Science"
              />
            </div>

            <div>
              <label className="block text-sm font-medium leading-6">
                Level *
              </label>
              <select
                required
                value={entry.level}
                onChange={(e) =>
                  updateEntry(index, {
                    level: e.target.value as EducationEntry["level"],
                  })
                }
                className={inputClass}
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium leading-6">
                Start year *
              </label>
              <input
                type="number"
                required
                min={1950}
                max={2100}
                value={entry.startYear}
                onChange={(e) =>
                  updateEntry(index, {
                    startYear: e.target.value ? Number(e.target.value) : "",
                  })
                }
                className={inputClass}
                placeholder="2018"
              />
            </div>

            <div>
              <label className="block text-sm font-medium leading-6">
                End year (or expected)
              </label>
              <input
                type="number"
                min={1950}
                max={2100}
                value={entry.endYear}
                onChange={(e) =>
                  updateEntry(index, {
                    endYear: e.target.value ? Number(e.target.value) : "",
                  })
                }
                className={inputClass}
                placeholder="2022"
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addEntry}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add another education
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