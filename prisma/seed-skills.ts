import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SKILLS: Array<{ name: string; category: string }> = [
  // Programming
  { name: "Python", category: "Programming" },
  { name: "JavaScript", category: "Programming" },
  { name: "TypeScript", category: "Programming" },
  { name: "Java", category: "Programming" },
  { name: "C++", category: "Programming" },
  { name: "C#", category: "Programming" },
  { name: "Go", category: "Programming" },
  { name: "Rust", category: "Programming" },
  { name: "Ruby", category: "Programming" },
  { name: "PHP", category: "Programming" },
  { name: "Swift", category: "Programming" },
  { name: "Kotlin", category: "Programming" },

  // Data & Databases
  { name: "SQL", category: "Data" },
  { name: "PostgreSQL", category: "Data" },
  { name: "MySQL", category: "Data" },
  { name: "MongoDB", category: "Data" },
  { name: "Data Analysis", category: "Data" },
  { name: "Data Visualization", category: "Data" },
  { name: "Excel", category: "Data" },
  { name: "Statistics", category: "Data" },

  // AI / ML
  { name: "Machine Learning", category: "AI/ML" },
  { name: "Deep Learning", category: "AI/ML" },
  { name: "Natural Language Processing", category: "AI/ML" },
  { name: "Computer Vision", category: "AI/ML" },
  { name: "Prompt Engineering", category: "AI/ML" },
  { name: "Data Annotation", category: "AI/ML" },
  { name: "AI Evaluation", category: "AI/ML" },

  // Mathematics
  { name: "Mathematics", category: "Mathematics" },
  { name: "Linear Algebra", category: "Mathematics" },
  { name: "Calculus", category: "Mathematics" },
  { name: "Probability", category: "Mathematics" },
  { name: "Discrete Mathematics", category: "Mathematics" },

  // Business
  { name: "Business Analysis", category: "Business" },
  { name: "Project Management", category: "Business" },
  { name: "Marketing", category: "Business" },
  { name: "Operations", category: "Business" },
  { name: "Supply Chain", category: "Business" },
  { name: "Product Management", category: "Business" },

  // Finance
  { name: "Financial Analysis", category: "Finance" },
  { name: "Accounting", category: "Finance" },
  { name: "Valuation", category: "Finance" },
  { name: "Financial Modeling", category: "Finance" },

  // Languages
  { name: "English", category: "Language" },
  { name: "French", category: "Language" },
  { name: "Spanish", category: "Language" },
  { name: "German", category: "Language" },
  { name: "Portuguese", category: "Language" },
  { name: "Mandarin", category: "Language" },
  { name: "Arabic", category: "Language" },
  { name: "Swahili", category: "Language" },
  { name: "Translation", category: "Language" },

  // Writing & Research
  { name: "Technical Writing", category: "Writing" },
  { name: "Research", category: "Writing" },
  { name: "Editing", category: "Writing" },
  { name: "Fact Checking", category: "Writing" },

  // Other
  { name: "Problem Solving", category: "General" },
  { name: "Critical Thinking", category: "General" },
  { name: "Attention to Detail", category: "General" },
];

async function main() {
  console.log("Seeding skills…");

  let created = 0;
  let skipped = 0;

  for (const skill of SKILLS) {
    const existing = await prisma.skill.findUnique({
      where: { name: skill.name },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.skill.create({ data: skill });
    created++;
  }

  console.log(`✔ ${created} skills created, ${skipped} already existed`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });