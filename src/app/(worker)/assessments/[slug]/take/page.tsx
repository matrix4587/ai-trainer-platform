import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { requireUser } from "@/server/auth/guards";
import { startAttempt } from "@/server/services/attempt.service";

import { TakeForm } from "./take-form";

export const metadata: Metadata = {
  title: "Taking assessment",
};

export default async function TakeAssessmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;

  const result = await startAttempt(slug, user.id);

  if (!result.ok) {
    if (result.reason === "NOT_FOUND") notFound();
    if (result.reason === "ATTEMPTS_EXHAUSTED") {
      redirect(`/assessments/${slug}`);
    }
    notFound();
  }

  return (
    <TakeForm
      attempt={result.attempt}
      assessmentSlug={slug}
    />
  );
}