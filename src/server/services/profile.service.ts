import { prisma } from "@/lib/prisma";

/**
 * Recalculate a user's profile completion based on actual data presence.
 * Weights (total 100):
 *   - Personal info (name, country, phone)    20
 *   - At least 1 education entry              15
 *   - At least 1 experience entry             15
 *   - At least 1 skill                        15
 *   - At least 1 language                     10
 *   - Resume uploaded                         15
 *   - Bio written (100+ chars)                10
 */
export async function recalculateProfileCompletion(
  userId: string,
): Promise<number> {
  const [profile, educationCount, experienceCount, skillCount, languageCount, resumeCount] =
    await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      prisma.education.count({ where: { userId } }),
      prisma.experience.count({ where: { userId } }),
      prisma.userSkill.count({ where: { userId } }),
      prisma.userLanguage.count({ where: { userId } }),
      prisma.resume.count({ where: { userId } }),
    ]);

  let completion = 0;

  // Personal info
  if (profile?.fullName && profile?.country && profile?.phoneNumber) {
    completion += 20;
  }

  // Education
  if (educationCount > 0) completion += 15;

  // Experience
  if (experienceCount > 0) completion += 15;

  // Skills
  if (skillCount > 0) completion += 15;

  // Languages
  if (languageCount > 0) completion += 10;

  // Resume
  if (resumeCount > 0) completion += 15;

  // Bio
  if (profile?.bio && profile.bio.length >= 100) completion += 10;

  // Persist
  await prisma.profile.update({
    where: { userId },
    data: { profileCompletion: completion },
  });

  return completion;
}