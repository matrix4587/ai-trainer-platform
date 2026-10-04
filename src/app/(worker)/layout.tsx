import Link from "next/link";
import { Sparkles } from "lucide-react";

import { requireUser } from "@/server/auth/guards";

import { Sidebar } from "./_components/sidebar";
import { Topbar } from "./_components/topbar";

export default async function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-rose-200 via-white to-sky-200">
      <Sidebar user={user} />

      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar user={user} />

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>

        <footer className="border-t bg-background px-6 py-4 text-center text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Evalia — Train Humans. Improve AI.
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}