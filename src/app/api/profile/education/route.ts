import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { recalculateProfileCompletion } from "@/server/services/profile.service";

const entrySchema = z.object({
  id: z.string().uuid().optional(),
  institution: z.string().min(2).max(200).trim(),
  degree: z.string().min(1).max(100).trim(),
  field: z.string().min(1).max(100).trim(),
  level: z.enum(["HIGH_SCHOOL", "BACHELORS", "MASTERS", "PHD", "OTHER"]),
  startYear: z.number().int().min(1950).max(2100),
  endYear: z.number().int().min(1950).max(2100).nullable().optional(),
});

const bodySchema = z.object({
  entries: z.array(entrySchema).min(1),
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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const userId = session.user.id;

  try {
    await prisma.education.deleteMany({ where: { userId } });

    for (const entry of parsed.data.entries) {
      await prisma.education.create({
        data: {
          userId,
          institution: entry.institution,
          degree: entry.degree,
          field: entry.field,
          level: entry.level,
          startYear: entry.startYear,
          endYear: entry.endYear ?? null,
        },
      });
    }
  } catch (err) {
    console.error("[education POST]", err);
    return NextResponse.json(
      { error: "Failed to save education. Please try again." },
      { status: 500 },
    );
  }

  try {
    const completion = await recalculateProfileCompletion(userId);
    return NextResponse.json({ ok: true, profileCompletion: completion });
  } catch (err) {
    console.error("[education POST] completion recalc failed", err);
    return NextResponse.json({ ok: true, profileCompletion: null });
  }
}