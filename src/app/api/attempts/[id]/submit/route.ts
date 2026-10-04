import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { submitAttempt } from "@/server/services/attempt.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account not active" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await submitAttempt(id, session.user.id);

    if (!result.ok) {
      const statusMap: Record<typeof result.reason, number> = {
        ATTEMPT_NOT_FOUND: 404,
        ATTEMPT_NOT_EDITABLE: 409,
      };
      return NextResponse.json(
        { error: result.reason },
        { status: statusMap[result.reason] },
      );
    }

    return NextResponse.json({ ok: true, attempt: result.attempt });
  } catch (err) {
    console.error(`[POST /api/attempts/${id}/submit] failed:`, err);
    return NextResponse.json({ error: "Failed to submit attempt" }, { status: 500 });
  }
}