import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { recalculateProfileCompletion } from "@/server/services/profile.service";

const entrySchema = z.object({
  id: z.string().uuid().optional(),
  company: z.string().min(1).max(200).trim(),
  position: z.string().min(1).max(200).trim(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  description: z.string().max(2000).nullable().optional(),
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
    await prisma.experience.deleteMany({ where: { userId } });

    for (const entry of parsed.data.entries) {
      await prisma.experience.create({
        data: {
          userId,
          company: entry.company,
          position: entry.position,
          startDate: new Date(entry.startDate),
          endDate: entry.endDate ? new Date(entry.endDate) : null,
          description: entry.description ?? null,
        },
      });
    }
  } catch (err) {
    console.error("[experience POST]", err);
    return NextResponse.json(
      { error: "Failed to save experience. Please try again." },
      { status: 500 },
    );
  }

  try {
    const completion = await recalculateProfileCompletion(userId);
    return NextResponse.json({ ok: true, profileCompletion: completion });
  } catch (err) {
    console.error("[experience POST] completion recalc failed", err);
    return NextResponse.json({ ok: true, profileCompletion: null });
  }
}