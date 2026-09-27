import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const existing = await prisma.profile.findUnique({ where: { userId } });
  if (!existing) {
    return NextResponse.json(
      { error: "Profile not found. Complete the first step first." },
      { status: 400 },
    );
  }

  await prisma.profile.update({
    where: { userId },
    data: {
      onboardingCompletedAt: new Date(),
      profileCompletion: 100,
    },
  });

  return NextResponse.json({ ok: true, profileCompletion: 100 });
}