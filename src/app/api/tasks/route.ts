import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { listAvailableTasksForUser } from "@/server/services/task.service";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account not active" }, { status: 403 });
  }

  try {
    const result = await listAvailableTasksForUser(session.user.id);

    if (!result.ok) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, tasks: result.tasks });
  } catch (err) {
    console.error("[GET /api/tasks] failed:", err);
    return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 });
  }
}