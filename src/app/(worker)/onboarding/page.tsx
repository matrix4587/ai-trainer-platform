import { redirect } from "next/navigation";

import { requireUser } from "@/server/auth/guards";
import { prisma } from "@/lib/prisma";

/**
 * Hub that sends the user to their first incomplete step.
 */
export default async function OnboardingHubPage() {
  const user = await requireUser();

  const [
    profile,
    educationCount,
    experienceCount,
    skillCount,
    languageCount,
    resumeCount,
  ] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: user.id } }),
    prisma.education.count({ where: { userId: user.id } }),
    prisma.experience.count({ where: { userId: user.id } }),
    prisma.userSkill.count({ where: { userId: user.id } }),
    prisma.userLanguage.count({ where: { userId: user.id } }),
    prisma.resume.count({ where: { userId: user.id } }),
  ]);

  // Already finished → send them to the dashboard
  if (profile?.onboardingCompletedAt) {
    redirect("/dashboard");
  }

  // Step 1: Personal
  if (!profile?.country || !profile?.phoneNumber) {
    redirect("/onboarding/personal");
  }

  // Step 2: Education
  if (educationCount === 0) {
    redirect("/onboarding/education");
  }

  // Step 3: Experience
  if (experienceCount === 0) {
    redirect("/onboarding/experience");
  }

  // Step 4: Skills
  if (skillCount === 0) {
    redirect("/onboarding/skills");
  }

  // Step 5: Languages
  if (languageCount === 0) {
    redirect("/onboarding/languages");
  }

  // Step 6: Resume (skippable, but send them there so they can choose)
  if (resumeCount === 0) {
    redirect("/onboarding/resume");
  }

  // Step 7: Review
  redirect("/onboarding/review");
}