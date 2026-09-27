import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { recalculateProfileCompletion } from "@/server/services/profile.service";

const personalSchema = z.object({
  fullName: z.string().min(2).max(100).trim(),
  country: z.string().min(2).max(100).trim(),
  phoneNumber: z.string().min(5).max(30).trim(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  linkedinUrl: z.string().url().optional().nullable().or(z.literal("")),
  bio: z.string().max(500).optional().nullable(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = personalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const { fullName, country, phoneNumber, dateOfBirth, linkedinUrl, bio } =
    parsed.data;

  await prisma.profile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      fullName,
      country,
      phoneNumber,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      linkedinUrl: linkedinUrl || null,
      bio: bio || null,
    },
    update: {
      fullName,
      country,
      phoneNumber,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      linkedinUrl: linkedinUrl || null,
      bio: bio || null,
    },
  });

  const completion = await recalculateProfileCompletion(session.user.id);

  return NextResponse.json({ ok: true, profileCompletion: completion });
}