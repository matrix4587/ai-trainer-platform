import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [user, profile, education, experience, skills, languages, resume] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          role: true,
          status: true,
          emailVerified: true,
          createdAt: true,
        },
      }),
      prisma.profile.findUnique({ where: { userId } }),
      prisma.education.findMany({
        where: { userId },
        orderBy: { startYear: "desc" },
      }),
      prisma.experience.findMany({
        where: { userId },
        orderBy: { startDate: "desc" },
      }),
      prisma.userSkill.findMany({
        where: { userId },
        include: { skill: true },
        orderBy: { proficiency: "desc" },
      }),
      prisma.userLanguage.findMany({
        where: { userId },
        include: { language: true },
        orderBy: { language: { name: "asc" } },
      }),
      prisma.resume.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user,
    profile,
    education,
    experience,
    skills: skills.map((s) => ({
      id: s.id,
      skillId: s.skillId,
      name: s.skill.name,
      category: s.skill.category,
      proficiency: s.proficiency,
      yearsUsed: s.yearsUsed,
    })),
    languages: languages.map((l) => ({
      id: l.id,
      languageId: l.languageId,
      code: l.language.code,
      name: l.language.name,
      fluency: l.fluency,
      isNative: l.isNative,
    })),
    resume: resume
      ? {
          id: resume.id,
          fileName: resume.fileName,
          fileKey: resume.fileKey,
          fileSize: resume.fileSize,
          mimeType: resume.mimeType,
          url: `/uploads/${resume.fileKey}`,
          createdAt: resume.createdAt,
        }
      : null,
  });
}