import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getAssessmentBySlug } from "@/server/services/assessment.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
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

  const { slug } = await params;

  try {
    const assessment = await getAssessmentBySlug(slug, session.user.id);
    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, assessment });
  } catch (err) {
    console.error(`[GET /api/assessments/${slug}] failed:`, err);
    return NextResponse.json(
      { error: "Failed to load assessment" },
      { status: 500 },
    );
  }
}