import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { listMyAssignments } from "@/server/services/task-assignment.service";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account not active" }, { status: 403 });
  }

  try {
    const result = await listMyAssignments(session.user.id);
    return NextResponse.json({ ok: true, assignments: result.assignments });
  } catch (err) {
    console.error("[GET /api/assignments] failed:", err);
    return NextResponse.json({ error: "Failed to load assignments" }, { status: 500 });
  }
}