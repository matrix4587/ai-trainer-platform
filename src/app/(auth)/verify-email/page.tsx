import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { verifyEmail, AuthError } from "@/server/services/auth.service";

export const metadata: Metadata = {
  title: "Verify email",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let success = false;
  let errorMessage = "";

  if (!token) {
    errorMessage = "Verification token is missing.";
  } else {
    try {
      await verifyEmail(token);
      success = true;
    } catch (err) {
      if (err instanceof AuthError) {
        errorMessage = err.message;
      } else {
        errorMessage = "Something went wrong. Please try again.";
      }
    }
  }

  if (success) {
    return (
      <div className="rounded-lg border bg-background p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          Email verified
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account is now active. You can log in and start using the
          platform.
        </p>
        <Button className="mt-6 w-full" asChild>
          <Link href="/login">Continue to login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-background p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <XCircle className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Verification failed
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
      <Button variant="outline" className="mt-6 w-full" asChild>
        <Link href="/register">Back to registration</Link>
      </Button>
    </div>
  );
}