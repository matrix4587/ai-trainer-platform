import type { Metadata } from "next";

import { requireUser } from "@/server/auth/guards";
import { prisma } from "@/lib/prisma";

import { EducationForm } from "./education-form";

export const metadata: Metadata = {
  title: "Education",
};

export default async function EducationPage() {
  const user = await requireUser();

  const education = await prisma.education.findMany({
    where: { userId: user.id },
    orderBy: [{ startYear: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="rounded-lg border bg-background p-6 shadow-sm md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Education</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add your academic background. You can add as many entries as you need.
        </p>
      </div>

      <EducationForm
        initialEntries={education.map((e: any) => ({
          id: e.id,
          institution: e.institution,
          degree: e.degree,
          field: e.field,
          level: e.level,
          startYear: e.startYear,
          // Convert null → "" for the empty input field
          endYear: e.endYear ?? "",
        }))}
      />
    </div>
  );
}