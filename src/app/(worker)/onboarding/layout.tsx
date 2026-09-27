import Link from "next/link";
import { Sparkles } from "lucide-react";

import { requireUser } from "@/server/auth/guards";
import { prisma } from "@/lib/prisma";

import { ProgressBar } from "./_components/progress-bar";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { profileCompletion: true },
  });

  const completion = profile?.profileCompletion ?? 0;

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span>EvalForge</span>
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Skip for now →
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <ProgressBar completion={completion} />
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}