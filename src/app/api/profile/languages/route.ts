import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { recalculateProfileCompletion } from "@/server/services/profile.service";

const entrySchema = z.object({
  languageId: z.string().uuid(),
  fluency: z.enum([
    "BASIC",
    "CONVERSATIONAL",
    "PROFESSIONAL",
    "FLUENT",
    "NATIVE",
  ]),
  isNative: z.boolean(),
});

const bodySchema = z.object({
  languages: z.array(entrySchema).min(1),
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
    await prisma.userLanguage.deleteMany({ where: { userId } });

    for (const entry of parsed.data.languages) {
      await prisma.userLanguage.create({
        data: {
          userId,
          languageId: entry.languageId,
          fluency: entry.fluency,
          isNative: entry.isNative,
        },
      });
    }
  } catch (err) {
    console.error("[languages POST]", err);
    return NextResponse.json(
      { error: "Failed to save languages. Please try again." },
      { status: 500 },
    );
  }

  try {
    const completion = await recalculateProfileCompletion(userId);
    return NextResponse.json({ ok: true, profileCompletion: completion });
  } catch (err) {
    console.error("[languages POST] completion recalc failed", err);
    return NextResponse.json({ ok: true, profileCompletion: null });
  }
}
