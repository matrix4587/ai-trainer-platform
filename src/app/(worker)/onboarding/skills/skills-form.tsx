"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SkillsByCategory = Record<string, { id: string; name: string }[]>;

export function SkillsForm({
  skillsByCategory,
  initialSelections,
}: {
  skillsByCategory: SkillsByCategory;
  initialSelections: Record<string, number>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, number>>(
    initialSelections,
  );
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return skillsByCategory;
    const q = search.toLowerCase();
    const result: SkillsByCategory = {};
    for (const [cat, skills] of Object.entries(skillsByCategory)) {
      const matches = skills.filter((s) => s.name.toLowerCase().includes(q));
      if (matches.length > 0) result[cat] = matches;
    }
    return result;
  }, [search, skillsByCategory]);

  function toggleSkill(skillId: string) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[skillId]) {
        delete next[skillId];
      } else {
        next[skillId] = 3; // default proficiency
      }
      return next;
    });
  }

  function setProficiency(skillId: string, value: number) {
    setSelected((prev) => ({ ...prev, [skillId]: value }));
  }

  const selectedCount = Object.keys(selected).length;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (selectedCount === 0) {
      setError("Please select at least one skill.");
      return;
    }

    setSubmitting(true);

    const payload = {
      skills: Object.entries(selected).map(([skillId, proficiency]) => ({
        skillId,
        proficiency,
      })),
    };

    try {
      const res = await fetch("/api/profile/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to save. Please try again.");
        setSubmitting(false);
        return;
      }

      router.push("/onboarding/languages");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Search */}
      <div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search skills…"
          className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {selectedCount > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {selectedCount} skill{selectedCount === 1 ? "" : "s"} selected
          </p>
        )}
      </div>

      {/* Categories */}
      <div className="max-h-[28rem] space-y-5 overflow-y-auto rounded-md border bg-muted/10 p-4">
        {Object.entries(filteredCategories).map(([category, skills]) => (
          <div key={category}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {category}
            </p>
            <div className="space-y-1">
              {skills.map((skill) => {
                const isSelected = selected[skill.id] !== undefined;
                const proficiency = selected[skill.id] ?? 3;

                return (
                  <div
                    key={skill.id}
                    className={cn(
                      "rounded-md border bg-background px-3 py-2 transition-colors",
                      isSelected ? "border-primary" : "border-transparent",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSkill(skill.id)}
                      className="flex w-full items-center gap-2 text-left text-sm"
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input",
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </span>
                      <span className="font-medium">{skill.name}</span>
                    </button>

                    {isSelected && (
                      <div className="mt-2 pl-6">
                        <label className="text-xs text-muted-foreground">
                          Proficiency: {proficiency}/5
                        </label>
                        <input
                          type="range"
                          min={1}
                          max={5}
                          step={1}
                          value={proficiency}
                          onChange={(e) =>
                            setProficiency(skill.id, Number(e.target.value))
                          }
                          className="mt-1 w-full accent-primary"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {Object.keys(filteredCategories).length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No skills match your search.
          </p>
        )}
      </div>

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