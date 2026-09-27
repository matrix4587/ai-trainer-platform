import type { Metadata } from "next";

import { requireUser } from "@/server/auth/guards";
import { prisma } from "@/lib/prisma";

import { SkillsForm } from "./skills-form";

export const metadata: Metadata = {
  title: "Skills",
};

export default async function SkillsPage() {
  const user = await requireUser();

  const [allSkills, userSkills] = await Promise.all([
    prisma.skill.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.userSkill.findMany({ where: { userId: user.id } }),
  ]);

  const userSkillMap = new Map(
    userSkills.map((us) => [us.skillId, us.proficiency]),
  );

  const skillsByCategory: Record<
    string,
    { id: string; name: string }[]
  > = {};
  for (const s of allSkills) {
    const cat = s.category ?? "Other";
    if (!skillsByCategory[cat]) skillsByCategory[cat] = [];
    skillsByCategory[cat].push({ id: s.id, name: s.name });
  }

  return (
    <div className="rounded-lg border bg-background p-6 shadow-sm md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select the skills you have and rate your proficiency. These help us
          match you with the right tasks.
        </p>
      </div>

      <SkillsForm
        skillsByCategory={skillsByCategory}
        initialSelections={Object.fromEntries(userSkillMap)}
      />
    </div>
  );
}