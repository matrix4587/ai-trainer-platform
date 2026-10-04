import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { submitTask } from "@/server/services/submission.service";

const bodySchema = z.object({
  response: z.unknown(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  comment: z.string().max(2000).nullable().optional(),
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
    const result = await submitTask(
      id,
      session.user.id,
      parsed.data.response,
      parsed.data.confidence ?? null,
      parsed.data.comment ?? null,
    );

    if (!result.ok) {
      const statusMap: Record<typeof result.reason, number> = {
        ASSIGNMENT_NOT_FOUND: 404,
        ASSIGNMENT_NOT_ACTIVE: 409,
        TASK_NOT_FOUND: 404,
        INVALID_RESPONSE: 422,
      };
      return NextResponse.json(
        { error: result.reason },
        { status: statusMap[result.reason] },
      );
    }

    return NextResponse.json({
      ok: true,
      submission: result.submission,
      assignmentStatus: result.assignmentStatus,
    });
  } catch (err) {
    console.error(`[POST /api/assignments/${id}/submit] failed:`, err);
    return NextResponse.json({ error: "Failed to submit task" }, { status: 500 });
  }
}
