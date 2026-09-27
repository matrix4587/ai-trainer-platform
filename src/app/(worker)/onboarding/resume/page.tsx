import type { Metadata } from "next";

import { requireUser } from "@/server/auth/guards";
import { prisma } from "@/lib/prisma";

import { ResumeForm } from "./resume-form";

export const metadata: Metadata = {
  title: "Resume",
};

export default async function ResumePage() {
  const user = await requireUser();

  const resume = await prisma.resume.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="rounded-lg border bg-background p-6 shadow-sm md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Resume</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your most recent resume. PDF or DOCX, up to 5 MB.
        </p>
      </div>

      <ResumeForm
        initialResume={
          resume
            ? {
                id: resume.id,
                fileName: resume.fileName,
                fileKey: resume.fileKey,
                fileSize: resume.fileSize,
                mimeType: resume.mimeType,
              }
            : null
        }
      />
    </div>
  );
}