"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type ExperienceEntry = {
  id?: string;
  company: string;
  position: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD or ""
  description: string;
};

function emptyEntry(): ExperienceEntry {
  return {
    company: "",
    position: "",
    startDate: "",
    endDate: "",
    description: "",
  };
}

export function ExperienceForm({
  initialEntries,
}: {
  initialEntries: ExperienceEntry[];
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<ExperienceEntry[]>(
    initialEntries.length > 0 ? initialEntries : [emptyEntry()],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateEntry(index: number, patch: Partial<ExperienceEntry>) {
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
      try {
        await fetch(`/api/profile/experience/${entry.id}`, { method: "DELETE" });
      } catch {
        // non-blocking
      }
    }
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const validEntries = entries
      .filter((e) => e.company.trim() && e.position.trim() && e.startDate)
      .map((e) => ({
        id: e.id,
        company: e.company.trim(),
        position: e.position.trim(),
        startDate: e.startDate,
        endDate: e.endDate || null,
        description: e.description.trim() || null,
      }));

    if (validEntries.length === 0) {
      setError("Please fill in at least one experience entry.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/profile/experience", {
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

      router.push("/onboarding/skills");
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
            <p className="text-sm font-medium">Experience #{index + 1}</p>
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
                Company *
              </label>
              <input
                type="text"
                required
                value={entry.company}
                onChange={(e) =>
                  updateEntry(index, { company: e.target.value })
                }
                className={inputClass}
                placeholder="Safaricom PLC"
              />
            </div>

            <div>
              <label className="block text-sm font-medium leading-6">
                Position *
              </label>
              <input
                type="text"
                required
                value={entry.position}
                onChange={(e) =>
                  updateEntry(index, { position: e.target.value })
                }
                className={inputClass}
                placeholder="Software Engineer"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium leading-6">
                Start date *
              </label>
              <input
                type="date"
                required
                value={entry.startDate}
                onChange={(e) =>
                  updateEntry(index, { startDate: e.target.value })
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium leading-6">
                End date (leave empty if current)
              </label>
              <input
                type="date"
                value={entry.endDate}
                onChange={(e) =>
                  updateEntry(index, { endDate: e.target.value })
                }
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium leading-6">
              Description
            </label>
            <textarea
              rows={3}
              value={entry.description}
              onChange={(e) =>
                updateEntry(index, { description: e.target.value })
              }
              className={inputClass}
              placeholder="Brief description of your responsibilities and achievements."
            />
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
        Add another experience
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