import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EQUIPMENT_MAP = {
  barbell: "BARBELL",
  "e-z curl bar": "BARBELL",
  dumbbell: "DUMBBELL",
  kettlebells: "DUMBBELL",
  machine: "MACHINE",
  cable: "CABLE",
  "body only": "BODYWEIGHT",
  bands: "BODYWEIGHT",
  "exercise ball": "BODYWEIGHT",
  "medicine ball": "BODYWEIGHT",
  "foam roll": "BODYWEIGHT",
  other: "BODYWEIGHT",
};

const MUSCLE_MAP = {
  abdominals: "Core",
  chest: "Chest",
  quadriceps: "Quadriceps",
  hamstrings: "Hamstrings",
  biceps: "Biceps",
  triceps: "Triceps",
  shoulders: "Shoulders",
  "middle back": "Back",
  lats: "Back",
  "lower back": "Lower Back",
  glutes: "Glutes",
  calves: "Calves",
  traps: "Traps",
  forearms: "Forearms",
  adductors: "Adductors",
  abductors: "Abductors",
  neck: "Neck",
};

function formatMuscle(m) {
  if (!m) return "Full Body";
  const lower = m.toLowerCase().trim();
  return MUSCLE_MAP[lower] || lower.charAt(0).toUpperCase() + lower.slice(1);
}

function formatCategory(eq) {
  if (!eq) return "BARBELL";
  const lower = eq.toLowerCase().trim();
  return EQUIPMENT_MAP[lower] || "BARBELL";
}

async function run() {
  console.log("Fetching exercises dataset from yuhonas/free-exercise-db...");
  const response = await fetch(
    "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch dataset: ${response.status} ${response.statusText}`);
  }

  const rawExercises = await response.json();
  console.log(`Fetched ${rawExercises.length} exercises. Normalizing...`);

  const normalizedExercises = rawExercises.map((ex) => {
    // Generate stable id from source id or sanitized name
    const slug = (ex.id || ex.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const id = `ex-${slug}`;

    const category = formatCategory(ex.equipment);
    const primaryMuscle = formatMuscle(ex.primaryMuscles?.[0]);
    const secondaryMuscles = (ex.secondaryMuscles || [])
      .map(formatMuscle)
      .filter((m) => m && m !== primaryMuscle);

    const firstImage = ex.images?.[0];
    const secondImage = ex.images?.[1] || firstImage;

    const imageUrl = firstImage
      ? `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${firstImage}`
      : null;
    const animationUrl = secondImage
      ? `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${secondImage}`
      : null;

    return {
      id,
      name: ex.name,
      category,
      primaryMuscle,
      secondaryMuscles,
      isCustom: false,
      imageUrl,
      animationUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  // Ensure directories exist
  const publicDataDir = path.join(process.cwd(), "public", "data");
  await fs.mkdir(publicDataDir, { recursive: true });

  const jsonOutputPath = path.join(publicDataDir, "exercises.json");
  await fs.writeFile(jsonOutputPath, JSON.stringify(normalizedExercises, null, 2), "utf8");
  console.log(`Saved ${normalizedExercises.length} normalized exercises to ${jsonOutputPath}`);

  console.log("Seeding into PostgreSQL database via Prisma...");
  const CHUNK_SIZE = 50;
  let inserted = 0;

  for (let i = 0; i < normalizedExercises.length; i += CHUNK_SIZE) {
    const chunk = normalizedExercises.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map((item) =>
        prisma.exercise.upsert({
          where: { id: item.id },
          update: {
            name: item.name,
            category: item.category,
            primaryMuscle: item.primaryMuscle,
            secondaryMuscles: item.secondaryMuscles,
            imageUrl: item.imageUrl,
            animationUrl: item.animationUrl,
            isCustom: false,
          },
          create: {
            id: item.id,
            name: item.name,
            category: item.category,
            primaryMuscle: item.primaryMuscle,
            secondaryMuscles: item.secondaryMuscles,
            imageUrl: item.imageUrl,
            animationUrl: item.animationUrl,
            isCustom: false,
          },
        })
      )
    );
    inserted += chunk.length;
    process.stdout.write(`\rProgress: ${inserted} / ${normalizedExercises.length} exercises upserted in DB`);
  }

  console.log("\nDatabase seeding completed successfully!");
  const totalCount = await prisma.exercise.count();
  console.log(`Total exercises currently in PostgreSQL DB: ${totalCount}`);
}

run()
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
