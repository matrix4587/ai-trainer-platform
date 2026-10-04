import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { startAttempt } from "@/server/services/attempt.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account not active" }, { status: 403 });
  }

  const { slug } = await params;

  try {
    const result = await startAttempt(slug, session.user.id);

    if (!result.ok) {
      if (result.reason === "NOT_FOUND") {
        return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
      }
      if (result.reason === "ATTEMPTS_EXHAUSTED") {
        return NextResponse.json({ error: "No attempts remaining" }, { status: 409 });
      }
      return NextResponse.json({ error: "Could not start attempt" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, attempt: result.attempt });
  } catch (err) {
    console.error(`[POST /api/assessments/${slug}/attempt] failed:`, err);
    return NextResponse.json({ error: "Failed to start attempt" }, { status: 500 });
  }
}