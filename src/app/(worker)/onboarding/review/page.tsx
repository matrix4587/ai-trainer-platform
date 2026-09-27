import type { Metadata } from "next";
import Link from "next/link";

import { requireUser } from "@/server/auth/guards";
import { prisma } from "@/lib/prisma";

import { ReviewActions } from "./review-actions";

export const metadata: Metadata = {
  title: "Review",
};

export default async function ReviewPage() {
  const user = await requireUser();

  const [profile, education, experience, skills, languages, resume] =
    await Promise.all([
      prisma.profile.findUnique({ where: { userId: user.id } }),
      prisma.education.findMany({
        where: { userId: user.id },
        orderBy: { startYear: "desc" },
      }),
      prisma.experience.findMany({
        where: { userId: user.id },
        orderBy: { startDate: "desc" },
      }),
      prisma.userSkill.findMany({
        where: { userId: user.id },
        include: { skill: true },
        orderBy: { proficiency: "desc" },
      }),
      prisma.userLanguage.findMany({
        where: { userId: user.id },
        include: { language: true },
        orderBy: { language: { name: "asc" } },
      }),
      prisma.resume.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const completion = profile?.profileCompletion ?? 0;
  const done = !!profile?.onboardingCompletedAt;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-background p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Review your profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirm everything looks right. You can edit any section before
          finishing.
        </p>
      </div>

      {/* Personal */}
      <Section
        title="Personal"
        href="/onboarding/personal"
        empty={!profile?.fullName}
      >
        {profile ? (
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <Row label="Full name" value={profile.fullName} />
            <Row label="Country" value={profile.country} />
            <Row label="Phone" value={profile.phoneNumber} />
            <Row
              label="Date of birth"
              value={
                profile.dateOfBirth
                  ? profile.dateOfBirth.toISOString().slice(0, 10)
                  : null
              }
            />
          </dl>
        ) : null}
      </Section>

      {/* Education */}
      <Section
        title="Education"
        href="/onboarding/education"
        empty={education.length === 0}
      >
        {education.map((e) => (
          <div key={e.id} className="rounded-md border bg-muted/10 p-3">
            <p className="text-sm font-medium">
              {e.degree} · {e.field}
            </p>
            <p className="text-xs text-muted-foreground">
              {e.institution} · {e.startYear} – {e.endYear ?? "present"} ·{" "}
              {e.level}
            </p>
          </div>
        ))}
      </Section>

      {/* Experience */}
      <Section
        title="Experience"
        href="/onboarding/experience"
        empty={experience.length === 0}
      >
        {experience.map((x) => (
          <div key={x.id} className="rounded-md border bg-muted/10 p-3">
            <p className="text-sm font-medium">
              {x.position} · {x.company}
            </p>
            <p className="text-xs text-muted-foreground">
              {x.startDate.toISOString().slice(0, 10)} –{" "}
              {x.endDate ? x.endDate.toISOString().slice(0, 10) : "present"}
            </p>
            {x.description && (
              <p className="mt-1 text-xs text-muted-foreground">
                {x.description}
              </p>
            )}
          </div>
        ))}
      </Section>

      {/* Skills */}
      <Section
        title="Skills"
        href="/onboarding/skills"
        empty={skills.length === 0}
      >
        <div className="flex flex-wrap gap-1.5">
          {skills.map((s) => (
            <span
              key={s.id}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
            >
              {s.skill.name} · {s.proficiency}/5
            </span>
          ))}
        </div>
      </Section>

      {/* Languages */}
      <Section
        title="Languages"
        href="/onboarding/languages"
        empty={languages.length === 0}
      >
        <div className="flex flex-wrap gap-1.5">
          {languages.map((l) => (
            <span
              key={l.id}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
            >
              {l.language.name} · {l.fluency}
              {l.isNative ? " (native)" : ""}
            </span>
          ))}
        </div>
      </Section>

      {/* Resume */}
      <Section
        title="Resume"
        href="/onboarding/resume"
        empty={!resume}
      >
        {resume ? (
          <p className="text-sm">
            📄 <span className="font-medium">{resume.fileName}</span>{" "}
            <span className="text-muted-foreground">
              ({Math.round(resume.fileSize / 1024)} KB · {resume.mimeType})
            </span>
          </p>
        ) : null}
      </Section>

      {/* Finish action */}
      <ReviewActions completion={completion} alreadyDone={done} />
    </div>
  );
}

function Section({
  title,
  href,
  empty,
  children,
}: {
  title: string;
  href: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-background p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        <Link
          href={href}
          className="text-xs font-medium text-primary hover:underline"
        >
          Edit
        </Link>
      </div>
      {empty ? (
        <p className="text-sm text-muted-foreground">
          Nothing here yet — click Edit to add.
        </p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || "—"}</dd>
    </div>
  );
}