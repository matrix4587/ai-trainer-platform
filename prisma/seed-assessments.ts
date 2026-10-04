import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding assessments...");

  // ───────────────────────────────────────────────────────────
  // 1. Capabilities
  // ───────────────────────────────────────────────────────────

  const capSentiment = await prisma.capability.upsert({
    where: { slug: "sentiment-analysis" },
    update: {},
    create: {
      name: "Sentiment Analysis",
      slug: "sentiment-analysis",
      description:
        "Classify text as positive, negative, or neutral with high accuracy.",
      category: "NLP",
      isActive: true,
    },
  });

  const capReasoning = await prisma.capability.upsert({
    where: { slug: "general-reasoning" },
    update: {},
    create: {
      name: "General Reasoning",
      slug: "general-reasoning",
      description: "Solve logic and reasoning problems systematically.",
      category: "Reasoning",
      isActive: true,
    },
  });

  const capWriting = await prisma.capability.upsert({
    where: { slug: "creative-writing" },
    update: {},
    create: {
      name: "Creative Writing",
      slug: "creative-writing",
      description:
        "Produce clear, engaging, and grammatically correct prose to a brief.",
      category: "Writing",
      isActive: true,
    },
  });

  const capCode = await prisma.capability.upsert({
    where: { slug: "python-code-review" },
    update: {},
    create: {
      name: "Python Code Review",
      slug: "python-code-review",
      description:
        "Read Python code, identify bugs, and suggest idiomatic improvements.",
      category: "Programming",
      isActive: true,
    },
  });

  console.log(
    `  Capabilities: ${capSentiment.slug}, ${capReasoning.slug}, ${capWriting.slug}, ${capCode.slug}`,
  );

  // ───────────────────────────────────────────────────────────
  // 2. Assessment 1 — Sentiment Analysis Basics
  // ───────────────────────────────────────────────────────────

  const a1 = await prisma.assessment.upsert({
    where: { slug: "sentiment-analysis-basics" },
    update: {},
    create: {
      name: "Sentiment Analysis Basics",
      slug: "sentiment-analysis-basics",
      description:
        "Test your ability to identify positive, negative, and neutral sentiment in short text samples.",
      category: "NLP",
      difficulty: "BEGINNER",
      status: "PUBLISHED",
      timeLimitMinutes: 15,
      passingScore: 70,
      maxAttempts: 3,
      randomizeQuestions: false,
      randomizeOptions: false,
      antiCheatEnabled: false,
    },
  });

  await prisma.question.deleteMany({ where: { assessmentId: a1.id } });

  const q1 = await prisma.question.create({
    data: {
      assessmentId: a1.id,
      type: "MULTIPLE_CHOICE",
      prompt: 'What is the sentiment of: "This product is amazing!"',
      points: 1,
      order: 0,
      correctAnswer: { optionId: "" },
      options: {
        create: [
          { label: "Positive", isCorrect: true, order: 0 },
          { label: "Negative", isCorrect: false, order: 1 },
          { label: "Neutral", isCorrect: false, order: 2 },
        ],
      },
    },
    include: { options: true },
  });
  await prisma.question.update({
    where: { id: q1.id },
    data: {
      correctAnswer: { optionId: q1.options.find((o) => o.isCorrect)?.id ?? "" },
    },
  });

  const q2 = await prisma.question.create({
    data: {
      assessmentId: a1.id,
      type: "MULTIPLE_CHOICE",
      prompt: 'What is the sentiment of: "The service was terrible and slow."',
      points: 1,
      order: 1,
      correctAnswer: { optionId: "" },
      options: {
        create: [
          { label: "Positive", isCorrect: false, order: 0 },
          { label: "Negative", isCorrect: true, order: 1 },
          { label: "Neutral", isCorrect: false, order: 2 },
        ],
      },
    },
    include: { options: true },
  });
  await prisma.question.update({
    where: { id: q2.id },
    data: {
      correctAnswer: { optionId: q2.options.find((o) => o.isCorrect)?.id ?? "" },
    },
  });

  const q3 = await prisma.question.create({
    data: {
      assessmentId: a1.id,
      type: "MULTIPLE_CHOICE",
      prompt: 'What is the sentiment of: "The package arrived on Tuesday."',
      points: 1,
      order: 2,
      correctAnswer: { optionId: "" },
      options: {
        create: [
          { label: "Positive", isCorrect: false, order: 0 },
          { label: "Negative", isCorrect: false, order: 1 },
          { label: "Neutral", isCorrect: true, order: 2 },
        ],
      },
    },
    include: { options: true },
  });
  await prisma.question.update({
    where: { id: q3.id },
    data: {
      correctAnswer: { optionId: q3.options.find((o) => o.isCorrect)?.id ?? "" },
    },
  });

  await prisma.qualificationRule.deleteMany({
    where: { assessmentId: a1.id },
  });

  await prisma.qualificationRule.create({
    data: {
      name: "Pass Sentiment Basics → Sentiment Analysis (Intermediate)",
      description:
        "Score 70 or above on Sentiment Analysis Basics to earn Intermediate Sentiment Analysis.",
      capabilityId: capSentiment.id,
      assessmentId: a1.id,
      conditions: { minScore: 70 },
      targetLevel: "INTERMEDIATE",
      isActive: true,
    },
  });

  console.log(`  Assessment 1: ${a1.slug} with 3 questions`);

  // ───────────────────────────────────────────────────────────
  // 3. Assessment 2 — General Reasoning
  // ───────────────────────────────────────────────────────────

  const a2 = await prisma.assessment.upsert({
    where: { slug: "general-reasoning" },
    update: {},
    create: {
      name: "General Reasoning",
      slug: "general-reasoning",
      description:
        "Basic logic and pattern-recognition questions to assess systematic reasoning.",
      category: "Reasoning",
      difficulty: "INTERMEDIATE",
      status: "PUBLISHED",
      timeLimitMinutes: 20,
      passingScore: 75,
      maxAttempts: 2,
      randomizeQuestions: false,
      randomizeOptions: false,
      antiCheatEnabled: false,
    },
  });

  await prisma.question.deleteMany({ where: { assessmentId: a2.id } });

  const r1 = await prisma.question.create({
    data: {
      assessmentId: a2.id,
      type: "MULTIPLE_CHOICE",
      prompt: "Complete the sequence: 2, 4, 8, 16, __",
      points: 1,
      order: 0,
      correctAnswer: { optionId: "" },
      options: {
        create: [
          { label: "20", isCorrect: false, order: 0 },
          { label: "24", isCorrect: false, order: 1 },
          { label: "32", isCorrect: true, order: 2 },
          { label: "36", isCorrect: false, order: 3 },
        ],
      },
    },
    include: { options: true },
  });
  await prisma.question.update({
    where: { id: r1.id },
    data: {
      correctAnswer: { optionId: r1.options.find((o) => o.isCorrect)?.id ?? "" },
    },
  });

  const r2 = await prisma.question.create({
    data: {
      assessmentId: a2.id,
      type: "TRUE_FALSE",
      prompt: "All squares are rectangles.",
      points: 1,
      order: 1,
      correctAnswer: { optionId: "" },
      options: {
        create: [
          { label: "True", isCorrect: true, order: 0 },
          { label: "False", isCorrect: false, order: 1 },
        ],
      },
    },
    include: { options: true },
  });
  await prisma.question.update({
    where: { id: r2.id },
    data: {
      correctAnswer: { optionId: r2.options.find((o) => o.isCorrect)?.id ?? "" },
    },
  });

  await prisma.qualificationRule.deleteMany({
    where: { assessmentId: a2.id },
  });

  await prisma.qualificationRule.create({
    data: {
      name: "Pass General Reasoning → General Reasoning (Intermediate)",
      description:
        "Score 75 or above on General Reasoning to earn Intermediate General Reasoning.",
      capabilityId: capReasoning.id,
      assessmentId: a2.id,
      conditions: { minScore: 75 },
      targetLevel: "INTERMEDIATE",
      isActive: true,
    },
  });

  console.log(`  Assessment 2: ${a2.slug} with 2 questions`);

  // ───────────────────────────────────────────────────────────
  // 4. Assessment 3 — Creative Writing: Grammar & Clarity
  // ───────────────────────────────────────────────────────────

  const a3 = await prisma.assessment.upsert({
    where: { slug: "creative-writing-grammar" },
    update: {},
    create: {
      name: "Creative Writing: Grammar & Clarity",
      slug: "creative-writing-grammar",
      description:
        "Choose the clearest, most grammatically correct version of each sentence.",
      category: "Writing",
      difficulty: "BEGINNER",
      status: "PUBLISHED",
      timeLimitMinutes: 15,
      passingScore: 70,
      maxAttempts: 3,
      randomizeQuestions: false,
      randomizeOptions: false,
      antiCheatEnabled: false,
    },
  });

  await prisma.question.deleteMany({ where: { assessmentId: a3.id } });

  const w1 = await prisma.question.create({
    data: {
      assessmentId: a3.id,
      type: "MULTIPLE_CHOICE",
      prompt: "Which sentence is grammatically correct?",
      points: 1,
      order: 0,
      correctAnswer: { optionId: "" },
      options: {
        create: [
          { label: "She don't like coffee.", isCorrect: false, order: 0 },
          { label: "She doesn't like coffee.", isCorrect: true, order: 1 },
          { label: "She not like coffee.", isCorrect: false, order: 2 },
        ],
      },
    },
    include: { options: true },
  });
  await prisma.question.update({
    where: { id: w1.id },
    data: {
      correctAnswer: { optionId: w1.options.find((o) => o.isCorrect)?.id ?? "" },
    },
  });

  const w2 = await prisma.question.create({
    data: {
      assessmentId: a3.id,
      type: "MULTIPLE_CHOICE",
      prompt: "Which sentence is the clearest?",
      points: 1,
      order: 1,
      correctAnswer: { optionId: "" },
      options: {
        create: [
          {
            label:
              "Due to the fact that it was raining, we decided to remain indoors.",
            isCorrect: false,
            order: 0,
          },
          {
            label: "Because it was raining, we stayed inside.",
            isCorrect: true,
            order: 1,
          },
          {
            label:
              "Owing to the precipitation event, an indoor decision was made by us.",
            isCorrect: false,
            order: 2,
          },
        ],
      },
    },
    include: { options: true },
  });
  await prisma.question.update({
    where: { id: w2.id },
    data: {
      correctAnswer: { optionId: w2.options.find((o) => o.isCorrect)?.id ?? "" },
    },
  });

  const w3 = await prisma.question.create({
    data: {
      assessmentId: a3.id,
      type: "MULTIPLE_CHOICE",
      prompt: "Which sentence uses the correct punctuation?",
      points: 1,
      order: 2,
      correctAnswer: { optionId: "" },
      options: {
        create: [
          {
            label: "Lets eat grandma!",
            isCorrect: false,
            order: 0,
          },
          {
            label: "Let's eat, grandma!",
            isCorrect: true,
            order: 1,
          },
          {
            label: "Let's eat grandma!",
            isCorrect: false,
            order: 2,
          },
        ],
      },
    },
    include: { options: true },
  });
  await prisma.question.update({
    where: { id: w3.id },
    data: {
      correctAnswer: { optionId: w3.options.find((o) => o.isCorrect)?.id ?? "" },
    },
  });

  await prisma.qualificationRule.deleteMany({
    where: { assessmentId: a3.id },
  });

  await prisma.qualificationRule.create({
    data: {
      name: "Pass Creative Writing Grammar → Creative Writing (Intermediate)",
      description:
        "Score 70 or above on Creative Writing: Grammar & Clarity to earn Intermediate Creative Writing.",
      capabilityId: capWriting.id,
      assessmentId: a3.id,
      conditions: { minScore: 70 },
      targetLevel: "INTERMEDIATE",
      isActive: true,
    },
  });

  console.log(`  Assessment 3: ${a3.slug} with 3 questions`);

  // ───────────────────────────────────────────────────────────
  // 5. Assessment 4 — Python Code Review
  // ───────────────────────────────────────────────────────────

  const a4 = await prisma.assessment.upsert({
    where: { slug: "python-code-review" },
    update: {},
    create: {
      name: "Python Code Review",
      slug: "python-code-review",
      description:
        "Identify bugs and idiomatic improvements in short Python code snippets.",
      category: "Programming",
      difficulty: "INTERMEDIATE",
      status: "PUBLISHED",
      timeLimitMinutes: 25,
      passingScore: 75,
      maxAttempts: 2,
      randomizeQuestions: false,
      randomizeOptions: false,
      antiCheatEnabled: false,
    },
  });

  await prisma.question.deleteMany({ where: { assessmentId: a4.id } });

  const p1 = await prisma.question.create({
    data: {
      assessmentId: a4.id,
      type: "MULTIPLE_CHOICE",
      prompt:
        "What is wrong with this Python code?\n\n```python\ndef add(a, b):\n    return a + B\n```",
      points: 1,
      order: 0,
      correctAnswer: { optionId: "" },
      options: {
        create: [
          { label: "Missing return type hint", isCorrect: false, order: 0 },
          {
            label: "`B` is undefined — capital letter typo",
            isCorrect: true,
            order: 1,
          },
          { label: "Should use `+=` instead", isCorrect: false, order: 2 },
        ],
      },
    },
    include: { options: true },
  });
  await prisma.question.update({
    where: { id: p1.id },
    data: {
      correctAnswer: { optionId: p1.options.find((o) => o.isCorrect)?.id ?? "" },
    },
  });

  const p2 = await prisma.question.create({
    data: {
      assessmentId: a4.id,
      type: "MULTIPLE_CHOICE",
      prompt:
        "What is the idiomatic way to check if a list is empty in Python?",
      points: 1,
      order: 1,
      correctAnswer: { optionId: "" },
      options: {
        create: [
          { label: "`if len(lst) == 0:`", isCorrect: false, order: 0 },
          { label: "`if lst == []:`", isCorrect: false, order: 1 },
          { label: "`if not lst:`", isCorrect: true, order: 2 },
        ],
      },
    },
    include: { options: true },
  });
  await prisma.question.update({
    where: { id: p2.id },
    data: {
      correctAnswer: { optionId: p2.options.find((o) => o.isCorrect)?.id ?? "" },
    },
  });

  const p3 = await prisma.question.create({
    data: {
      assessmentId: a4.id,
      type: "TRUE_FALSE",
      prompt:
        "In Python, mutable default arguments (e.g. `def f(x=[])`) are safe to use.",
      points: 1,
      order: 2,
      correctAnswer: { optionId: "" },
      options: {
        create: [
          { label: "True", isCorrect: false, order: 0 },
          { label: "False", isCorrect: true, order: 1 },
        ],
      },
    },
    include: { options: true },
  });
  await prisma.question.update({
    where: { id: p3.id },
    data: {
      correctAnswer: { optionId: p3.options.find((o) => o.isCorrect)?.id ?? "" },
    },
  });

  await prisma.qualificationRule.deleteMany({
    where: { assessmentId: a4.id },
  });

  await prisma.qualificationRule.create({
    data: {
      name: "Pass Python Code Review → Python Code Review (Intermediate)",
      description:
        "Score 75 or above on Python Code Review to earn Intermediate Python Code Review.",
      capabilityId: capCode.id,
      assessmentId: a4.id,
      conditions: { minScore: 75 },
      targetLevel: "INTERMEDIATE",
      isActive: true,
    },
  });

  console.log(`  Assessment 4: ${a4.slug} with 3 questions`);

  console.log(
    "Done. Seeded 4 capabilities, 4 assessments, 11 questions, 4 rules.",
  );
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });