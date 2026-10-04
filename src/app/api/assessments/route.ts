import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { listPublishedAssessments } from "@/server/services/assessment.service";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Account not active" },
      { status: 403 },
    );
  }

  try {
    const assessments = await listPublishedAssessments();
    return NextResponse.json({ ok: true, assessments });
  } catch (err) {
    console.error("[GET /api/assessments] failed:", err);
    return NextResponse.json(
      { error: "Failed to load assessments" },
      { status: 500 },
    );
  }
}