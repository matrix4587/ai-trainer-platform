import type { Metadata } from "next";

import { requireUser } from "@/server/auth/guards";
import { prisma } from "@/lib/prisma";

import { LanguagesForm } from "./languages-form";

export const metadata: Metadata = {
  title: "Languages",
};

export default async function LanguagesPage() {
  const user = await requireUser();

  const [allLanguages, userLanguages] = await Promise.all([
    prisma.language.findMany({ orderBy: { name: "asc" } }),
    prisma.userLanguage.findMany({
      where: { userId: user.id },
      include: { language: true },
    }),
  ]);

  return (
    <div className="rounded-lg border bg-background p-6 shadow-sm md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Languages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Which languages do you speak? Fluency affects the tasks you can
          receive.
        </p>
      </div>

      <LanguagesForm
        allLanguages={allLanguages.map((l) => ({
          id: l.id,
          name: l.name,
          code: l.code,
        }))}
        initialSelections={userLanguages.map((ul) => ({
          languageId: ul.languageId,
          fluency: ul.fluency,
          isNative: ul.isNative,
        }))}
      />
    </div>
  );
}