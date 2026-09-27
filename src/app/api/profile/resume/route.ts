import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { recalculateProfileCompletion } from "@/server/services/profile.service";
import { saveResumeFile, deleteResumeFile } from "@/lib/storage";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ACCEPTED.includes(file.type)) {
    return NextResponse.json(
      { error: "Only PDF and DOCX files are allowed" },
      { status: 415 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File is too large. Max 5 MB." },
      { status: 413 },
    );
  }

  const userId = session.user.id;

  // Wipe any existing resume (and its file) first
  const existing = await prisma.resume.findFirst({ where: { userId } });
  if (existing) {
    await deleteResumeFile(existing.fileKey);
    await prisma.resume.delete({ where: { id: existing.id } });
  }

  // Save new file + DB row
  let saved;
  try {
    saved = await saveResumeFile(userId, file);
  } catch (err) {
    console.error("[resume POST] file save failed", err);
    return NextResponse.json(
      { error: "Failed to save file. Please try again." },
      { status: 500 },
    );
  }

  const created = await prisma.resume.create({
    data: {
      userId,
      fileName: saved.fileName,
      fileKey: saved.fileKey,
      fileSize: saved.size,
      mimeType: saved.mimeType,
    },
  });

  await recalculateProfileCompletion(userId);

  return NextResponse.json({
    ok: true,
    resume: {
      id: created.id,
      fileName: created.fileName,
      fileKey: created.fileKey,
      fileSize: created.fileSize,
      mimeType: created.mimeType,
    },
  });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const existing = await prisma.resume.findFirst({ where: { userId } });

  if (existing) {
    await deleteResumeFile(existing.fileKey);
    await prisma.resume.delete({ where: { id: existing.id } });
  }

  await recalculateProfileCompletion(userId);

  return NextResponse.json({ ok: true });
}