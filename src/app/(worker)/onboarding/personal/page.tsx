import type { Metadata } from "next";

import { requireUser } from "@/server/auth/guards";
import { prisma } from "@/lib/prisma";

import { PersonalForm } from "./personal-form";

export const metadata: Metadata = {
  title: "Personal information",
};

export default async function PersonalInfoPage() {
  const user = await requireUser();

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });

  return (
    <div className="rounded-lg border bg-background p-6 shadow-sm md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Personal information
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us about yourself. This helps us match you with the right tasks.
        </p>
      </div>

      <PersonalForm
        defaultValues={{
          fullName: profile?.fullName ?? user.name ?? "",
          country: profile?.country ?? "",
          phoneNumber: profile?.phoneNumber ?? "",
          dateOfBirth: profile?.dateOfBirth
            ? profile.dateOfBirth.toISOString().slice(0, 10)
            : "",
          linkedinUrl: profile?.linkedinUrl ?? "",
          bio: profile?.bio ?? "",
        }}
      />
    </div>
  );
}