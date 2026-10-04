import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding tasks...");

  const capSentiment = await prisma.capability.findUnique({
    where: { slug: "sentiment-analysis" },
  });
  const capReasoning = await prisma.capability.findUnique({
    where: { slug: "general-reasoning" },
  });

  if (!capSentiment) {
    throw new Error(
      "Missing capability 'sentiment-analysis'. Run `pnpm seed:assessments` first.",
    );
  }
  if (!capReasoning) {
    throw new Error(
      "Missing capability 'general-reasoning'. Run `pnpm seed:assessments` first.",
    );
  }

  const clientUser = await prisma.user.upsert({
    where: { email: "client@evalia.app" },
    update: {},
    create: {
      email: "client@evalia.app",
      name: "Evalia Client Demo",
      role: "CLIENT",
      status: "ACTIVE",
    },
  });

  const client = await prisma.client.upsert({
    where: { userId: clientUser.id },
    update: {},
    create: {
      userId: clientUser.id,
      company: "Acme Analytics",
      industry: "Data & AI",
    },
  });

  const projectSentiment = await prisma.project.upsert({
    where: { slug: "sentiment-batch-001" },
    update: {},
    create: {
      clientId: client.id,
      name: "Sentiment Labeling — Batch 001",
      slug: "sentiment-batch-001",
      description:
        "Label the sentiment of short customer reviews. All tasks require Intermediate Sentiment Analysis.",
      category: "NLP",
      difficulty: "INTERMEDIATE",
      status: "ACTIVE",
      ratePerHourCents: 800,
      currency: "USD",
      qualityThreshold: 85,
    },
  });

  const projectReasoning = await prisma.project.upsert({
    where: { slug: "reasoning-eval-001" },
    update: {},
    create: {
      clientId: client.id,
      name: "Reasoning Evaluation — Batch 001",
      slug: "reasoning-eval-001",
      description:
        "Evaluate the correctness of reasoning traces from an LLM. Requires Intermediate General Reasoning.",
      category: "Reasoning",
      difficulty: "INTERMEDIATE",
      status: "ACTIVE",
      ratePerHourCents: 1000,
      currency: "USD",
      qualityThreshold: 85,
    },
  });

  await prisma.task.deleteMany({
    where: { projectId: { in: [projectSentiment.id, projectReasoning.id] } },
  });

  const task1 = await prisma.task.create({
    data: {
      projectId: projectSentiment.id,
      title: "Classify a customer review",
      instructions:
        'Read the review and choose the sentiment that best matches it: Positive, Negative, or Neutral. Use the whole sentence, not just individual words.',
      content: {
        review:
          "The delivery was quick but the product arrived scratched. Support was helpful though.",
      },
      difficulty: "INTERMEDIATE",
      status: "AVAILABLE",
      priority: 5,
      estimatedMinutes: 3,
      maxAssignments: 20,
      ratePerHourCents: 800,
      isGoldTask: false,
      requirements: {
        create: [
          {
            capabilityId: capSentiment.id,
            minLevel: "INTERMEDIATE",
            minScore: null,
          },
        ],
      },
    },
  });

  const task2 = await prisma.task.create({
    data: {
      projectId: projectSentiment.id,
      title: "Classify a second customer review",
      instructions:
        "Choose the sentiment that best matches the review: Positive, Negative, or Neutral.",
      content: {
        review:
          "Absolutely love this! Will definitely be ordering again next month.",
      },
      difficulty: "BEGINNER",
      status: "AVAILABLE",
      priority: 5,
      estimatedMinutes: 2,
      maxAssignments: 30,
      ratePerHourCents: 600,
      isGoldTask: false,
      requirements: {
        create: [
          {
            capabilityId: capSentiment.id,
            minLevel: "BEGINNER",
            minScore: null,
          },
        ],
      },
    },
  });

  const task3 = await prisma.task.create({
    data: {
      projectId: projectReasoning.id,
      title: "Rate the reasoning of an LLM answer",
      instructions:
        'Read the question and the model\'s reasoning. Decide whether the reasoning is "Sound" or "Flawed".',
      content: {
        question: "If all cats are mammals, and Tom is a cat, is Tom a mammal?",
        reasoning:
          "All cats are mammals. Tom is a cat. Therefore Tom is a mammal.",
      },
      difficulty: "INTERMEDIATE",
      status: "AVAILABLE",
      priority: 3,
      estimatedMinutes: 5,
      maxAssignments: 15,
      ratePerHourCents: 1000,
      isGoldTask: false,
      requirements: {
        create: [
          {
            capabilityId: capReasoning.id,
            minLevel: "INTERMEDIATE",
            minScore: null,
          },
        ],
      },
    },
  });

  console.log(`  Project 1: ${projectSentiment.slug} with 2 tasks`);
  console.log(`  Project 2: ${projectReasoning.slug} with 1 task`);
  console.log(
    `  Tasks: ${task1.id.slice(0, 8)}, ${task2.id.slice(0, 8)}, ${task3.id.slice(0, 8)}`,
  );
  console.log("Done. Seeded 1 client, 2 projects, 3 tasks.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });