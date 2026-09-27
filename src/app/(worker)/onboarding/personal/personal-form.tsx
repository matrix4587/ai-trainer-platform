"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type Defaults = {
  fullName: string;
  country: string;
  phoneNumber: string;
  dateOfBirth: string;
  linkedinUrl: string;
  bio: string;
};

export function PersonalForm({ defaultValues }: { defaultValues: Defaults }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      fullName: String(formData.get("fullName") ?? "").trim(),
      country: String(formData.get("country") ?? "").trim(),
      phoneNumber: String(formData.get("phoneNumber") ?? "").trim(),
      dateOfBirth: String(formData.get("dateOfBirth") ?? "").trim() || null,
      linkedinUrl: String(formData.get("linkedinUrl") ?? "").trim() || null,
      bio: String(formData.get("bio") ?? "").trim() || null,
    };

    try {
      const res = await fetch("/api/profile/personal", {
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

      router.push("/onboarding/education");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  const inputClass =
    "mt-2 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="fullName"
          className="block text-sm font-medium leading-6"
        >
          Full name *
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          defaultValue={defaultValues.fullName}
          className={inputClass}
          placeholder="Jane Doe"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="country"
            className="block text-sm font-medium leading-6"
          >
            Country *
          </label>
          <input
            id="country"
            name="country"
            type="text"
            required
            defaultValue={defaultValues.country}
            className={inputClass}
            placeholder="Kenya"
          />
        </div>

        <div>
          <label
            htmlFor="phoneNumber"
            className="block text-sm font-medium leading-6"
          >
            Phone number *
          </label>
          <input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            required
            defaultValue={defaultValues.phoneNumber}
            className={inputClass}
            placeholder="+254 700 000 000"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="dateOfBirth"
            className="block text-sm font-medium leading-6"
          >
            Date of birth
          </label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            defaultValue={defaultValues.dateOfBirth}
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="linkedinUrl"
            className="block text-sm font-medium leading-6"
          >
            LinkedIn URL
          </label>
          <input
            id="linkedinUrl"
            name="linkedinUrl"
            type="url"
            defaultValue={defaultValues.linkedinUrl}
            className={inputClass}
            placeholder="https://linkedin.com/in/janedoe"
          />
        </div>
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium leading-6">
          Short bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          defaultValue={defaultValues.bio}
          className={inputClass}
          placeholder="A few sentences about your background and areas of expertise."
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Max 500 characters.
        </p>
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