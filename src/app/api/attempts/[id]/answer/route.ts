import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { saveAnswer } from "@/server/services/attempt.service";

const bodySchema = z.object({
  questionId: z.string().uuid(),
  response: z.unknown(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account not active" }, { status: 403 });
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
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { id } = await params;

  try {
    const result = await saveAnswer(
      id,
      session.user.id,
      parsed.data.questionId,
      parsed.data.response,
    );

    if (!result.ok) {
      const statusMap: Record<typeof result.reason, number> = {
        ATTEMPT_NOT_FOUND: 404,
        ATTEMPT_NOT_EDITABLE: 409,
        QUESTION_NOT_IN_ASSESSMENT: 400,
        INVALID_RESPONSE: 422,
      };
      return NextResponse.json(
        { error: result.reason },
        { status: statusMap[result.reason] },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[POST /api/attempts/${id}/answer] failed:`, err);
    return NextResponse.json({ error: "Failed to save answer" }, { status: 500 });
  }
}