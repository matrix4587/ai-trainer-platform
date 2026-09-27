import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Check your email",
};

export default async function VerifyEmailPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="rounded-lg border bg-background p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MailCheck className="h-6 w-6" />
      </div>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Check your email
      </h1>

      <p className="mt-2 text-sm text-muted-foreground">
        We sent a verification link to{" "}
        {email ? (
          <span className="font-medium text-foreground">{email}</span>
        ) : (
          "your inbox"
        )}
        . Click the link to activate your account.
      </p>

      <div className="mt-6 rounded-md bg-muted p-4 text-left text-xs">
        <p className="font-semibold text-foreground">Developing locally?</p>
        <p className="mt-1 text-muted-foreground">
          The verification link is printed to the terminal running{" "}
          <code className="rounded bg-background px-1 py-0.5">
            pnpm dev
          </code>
          . Look for the{" "}
          <code className="rounded bg-background px-1 py-0.5">
            📧 EMAIL (dev mode)
          </code>{" "}
          block and copy the URL.
        </p>
      </div>

      <Button variant="outline" className="mt-6" asChild>
        <Link href="/login">Back to login</Link>
      </Button>
    </div>
  );
}