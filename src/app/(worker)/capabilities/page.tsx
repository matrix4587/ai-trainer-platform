import type { Metadata } from "next";
import Link from "next/link";
import { Award, BookOpenCheck, Calendar, Sparkles } from "lucide-react";

import { requireUser } from "@/server/auth/guards";
import { listUserCapabilities } from "@/server/services/capability.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Capabilities",
};

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
};

const LEVEL_CLASS: Record<string, string> = {
  BEGINNER: "bg-muted text-muted-foreground",
  INTERMEDIATE: "bg-primary/10 text-primary",
  ADVANCED: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  EXPERT: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function CapabilitiesPage() {
  const user = await requireUser();
  const capabilities = await listUserCapabilities(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Capabilities</h1>
          <p className="text-sm text-muted-foreground">
            Skills you&apos;ve unlocked by passing assessments. These determine
            which tasks you can accept.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/assessments">
            <BookOpenCheck className="mr-1.5 h-4 w-4" />
            Take an assessment
          </Link>
        </Button>
      </div>

      {capabilities.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Award className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-base font-semibold">
                No capabilities yet
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Complete your first assessment to earn a capability. Once you
                have one, qualified tasks will appear on your tasks page.
              </p>
              <Button className="mt-6" asChild>
                <Link href="/assessments">Browse assessments</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total capabilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{capabilities.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Expert level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {capabilities.filter((c) => c.level === "EXPERT").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(
                    capabilities.reduce((sum, c) => sum + c.score, 0) /
                      capabilities.length,
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {capabilities.map((cap) => (
              <Card key={cap.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{cap.name}</CardTitle>
                    {cap.category ? (
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {cap.category}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      LEVEL_CLASS[cap.level] ?? "bg-muted text-muted-foreground"
                    }`}
                  >
                    {LEVEL_LABEL[cap.level] ?? cap.level}
                  </span>
                </CardHeader>
                <CardContent className="space-y-3">
                  {cap.description ? (
                    <p className="text-sm text-muted-foreground">
                      {cap.description}
                    </p>
                  ) : null}

                  <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Score {cap.score}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(cap.grantedAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
