import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { acceptTask } from "@/server/services/task-assignment.service";

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
    const result = await acceptTask(id, session.user.id);

    if (!result.ok) {
      const statusMap: Record<typeof result.reason, number> = {
        TASK_NOT_FOUND: 404,
        TASK_NOT_AVAILABLE: 409,
        PROJECT_NOT_ACTIVE: 409,
        NOT_QUALIFIED: 403,
        TASK_FULL: 409,
      };
      return NextResponse.json(
        { error: result.reason },
        { status: statusMap[result.reason] },
      );
    }

    return NextResponse.json({
      ok: true,
      assignment: result.assignment,
      alreadyExisted: result.alreadyExisted,
    });
  } catch (err) {
    console.error(`[POST /api/tasks/${id}/accept] failed:`, err);
    return NextResponse.json({ error: "Failed to accept task" }, { status: 500 });
  }
}