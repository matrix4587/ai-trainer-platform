import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { recalculateProfileCompletion } from "@/server/services/profile.service";

const skillSchema = z.object({
  skillId: z.string().uuid(),
  proficiency: z.number().int().min(1).max(5),
});

const bodySchema = z.object({
  skills: z.array(skillSchema).min(1),
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
    // Step 1: wipe existing selections (simple, idempotent)
    await prisma.userSkill.deleteMany({ where: { userId } });

    // Step 2: create new selections one by one (avoids holding a long transaction)
    for (const entry of parsed.data.skills) {
      await prisma.userSkill.create({
        data: {
          userId,
          skillId: entry.skillId,
          proficiency: entry.proficiency,
        },
      });
    }
  } catch (err) {
    console.error("[skills POST]", err);
    return NextResponse.json(
      { error: "Failed to save skills. Please try again." },
      { status: 500 },
    );
  }

  // Step 3: recalculate completion (best-effort, outside the write block)
  try {
    const completion = await recalculateProfileCompletion(userId);
    return NextResponse.json({ ok: true, profileCompletion: completion });
  } catch (err) {
    console.error("[skills POST] completion recalc failed", err);
    return NextResponse.json({ ok: true, profileCompletion: null });
  }
}