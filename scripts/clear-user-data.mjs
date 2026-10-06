import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clearUserData() {
  console.log("--- Starting database cleanup for fresh start ---");

  // Count current records
  const [
    userCount,
    accountCount,
    sessionCount,
    workoutCount,
    setCount,
    routineCount,
    routineItemCount,
    weightCount,
    customExerciseCount,
    totalExerciseCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.account.count(),
    prisma.session.count(),
    prisma.workoutSession.count(),
    prisma.setLog.count(),
    prisma.routine.count(),
    prisma.routineItem.count(),
    prisma.bodyWeightLog.count(),
    prisma.exercise.count({
      where: { OR: [{ isCustom: true }, { userId: { not: null } }] },
    }),
    prisma.exercise.count(),
  ]);

  console.log("Current state before cleanup:", {
    users: userCount,
    accounts: accountCount,
    sessions: sessionCount,
    workouts: workoutCount,
    sets: setCount,
    routines: routineCount,
    routineItems: routineItemCount,
    bodyWeights: weightCount,
    customExercises: customExerciseCount,
    totalCatalogExercises: totalExerciseCount,
  });

  // 1. Delete dependent workout logs
  const deletedSets = await prisma.setLog.deleteMany({});
  console.log(`Deleted ${deletedSets.count} set logs.`);

  const deletedWorkouts = await prisma.workoutSession.deleteMany({});
  console.log(`Deleted ${deletedWorkouts.count} workout sessions.`);

  // 2. Delete routines
  const deletedRoutineItems = await prisma.routineItem.deleteMany({});
  console.log(`Deleted ${deletedRoutineItems.count} routine items.`);

  const deletedRoutines = await prisma.routine.deleteMany({});
  console.log(`Deleted ${deletedRoutines.count} routines.`);

  // 3. Delete body weight records
  const deletedWeights = await prisma.bodyWeightLog.deleteMany({});
  console.log(`Deleted ${deletedWeights.count} body weight logs.`);

  // 4. Delete custom exercises created by users (keep the 876 catalog exercises)
  const deletedCustomExercises = await prisma.exercise.deleteMany({
    where: { OR: [{ isCustom: true }, { userId: { not: null } }] },
  });
  console.log(`Deleted ${deletedCustomExercises.count} custom user exercises.`);

  // 5. Delete authentication tokens & sessions
  const deletedSessions = await prisma.session.deleteMany({});
  console.log(`Deleted ${deletedSessions.count} active sessions.`);

  const deletedAccounts = await prisma.account.deleteMany({});
  console.log(`Deleted ${deletedAccounts.count} OAuth accounts.`);

  const deletedTokens = await prisma.verificationToken.deleteMany({});
  console.log(`Deleted ${deletedTokens.count} verification tokens.`);

  // 6. Delete all users
  const deletedUsers = await prisma.user.deleteMany({});
  console.log(`Deleted ${deletedUsers.count} users.`);

  // Final count check
  const [remainingUsers, remainingExercises] = await Promise.all([
    prisma.user.count(),
    prisma.exercise.count(),
  ]);

  console.log("\n--- Cleanup Summary ---");
  console.log(`Remaining Users: ${remainingUsers}`);
  console.log(`Remaining Exercises in Catalog: ${remainingExercises}`);
  console.log("Database is clean and ready for fresh start!");
}

clearUserData()
  .catch((err) => {
    console.error("Cleanup error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
