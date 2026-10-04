import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <img
              src="/logo.png"
              alt="Evalia"
              className="h-10 w-10 rounded-md object-contain"
            />
            <span>Evalia</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            Train Humans. Improve AI.
          </p>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="border-t bg-background py-6">
        <div className="container flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Evalia</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}