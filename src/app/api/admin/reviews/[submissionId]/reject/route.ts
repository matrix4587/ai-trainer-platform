import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { rejectSubmission } from "@/server/services/review.service";

const bodySchema = z.object({
  comment: z.string().max(2000).nullable().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account not active" }, { status: 403 });
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
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

  const { submissionId } = await params;

  try {
    const result = await rejectSubmission(
      submissionId,
      session.user.id,
      parsed.data.comment ?? null,
    );

    if (!result.ok) {
      const statusMap: Record<typeof result.reason, number> = {
        SUBMISSION_NOT_FOUND: 404,
        ALREADY_REVIEWED: 409,
      };
      return NextResponse.json(
        { error: result.reason },
        { status: statusMap[result.reason] },
      );
    }

    return NextResponse.json({ ok: true, reviewId: result.reviewId });
  } catch (err) {
    console.error(
      `[POST /api/admin/reviews/${submissionId}/reject] failed:`,
      err,
    );
    return NextResponse.json(
      { error: "Failed to reject submission" },
      { status: 500 },
    );
  }
}