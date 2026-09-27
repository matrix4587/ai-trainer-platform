import type { Metadata } from "next";

import { requireUser } from "@/server/auth/guards";
import { prisma } from "@/lib/prisma";

import { ExperienceForm } from "./experience-form";

export const metadata: Metadata = {
  title: "Experience",
};

export default async function ExperiencePage() {
  const user = await requireUser();

  const experience = await prisma.experience.findMany({
    where: { userId: user.id },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="rounded-lg border bg-background p-6 shadow-sm md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Experience</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us about your professional background. You can add multiple roles.
        </p>
      </div>

      <ExperienceForm
        initialEntries={experience.map((e) => ({
          id: e.id,
          company: e.company,
          position: e.position,
          startDate: e.startDate.toISOString().slice(0, 10),
          endDate: e.endDate ? e.endDate.toISOString().slice(0, 10) : "",
          description: e.description ?? "",
        }))}
      />
    </div>
  );
}