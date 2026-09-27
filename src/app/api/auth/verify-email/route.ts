import { NextResponse } from "next/server";

import { verifyEmailSchema } from "@/lib/validators/auth";
import { verifyEmail, AuthError } from "@/server/services/auth.service";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = verifyEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  try {
    const { userId } = await verifyEmail(parsed.data.token);
    return NextResponse.json({ message: "Email verified successfully", userId });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    console.error("[verify-email]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}