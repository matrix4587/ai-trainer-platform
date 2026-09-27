import { mkdir, writeFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    return mkdir(dir, { recursive: true });
  }
  return Promise.resolve();
}

/**
 * Save a resume file to local disk.
 * Returns the public URL and the storage key (used to delete later).
 */
export async function saveResumeFile(
  userId: string,
  file: File,
): Promise<{ fileKey: string; url: string; size: number; mimeType: string; fileName: string }> {
  const ext = path.extname(file.name).toLowerCase() || ".bin";
  const dir = path.join(UPLOAD_ROOT, "resumes", userId);
  await ensureDir(dir);

  const fileKey = `resumes/${userId}/${randomUUID()}${ext}`;
  const fullPath = path.join(UPLOAD_ROOT, fileKey);

  const arrayBuffer = await file.arrayBuffer();
  await writeFile(fullPath, Buffer.from(arrayBuffer));

  return {
    fileKey,
    url: `/uploads/${fileKey}`,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
    fileName: file.name,
  };
}

/**
 * Delete a resume file from local disk by its storage key.
 * Silently ignores missing files.
 */
export async function deleteResumeFile(fileKey: string): Promise<void> {
  const fullPath = path.join(UPLOAD_ROOT, fileKey);
  try {
    await unlink(fullPath);
  } catch {
    // File already gone — nothing to do.
  }
}